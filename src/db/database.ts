import fs from 'fs'
import { DB, UI, IntraLogin, Time, MailID, Mail } from '../types'
import * as mailer from './getMails'
import { getLogtimeReport } from './getLogtimeReport'
import { getForwardVerification } from './getForwardVerification'

function formatDate(date: Date, hoursMinutes: boolean = true): Time.Date {
	const dateFormat: Intl.DateTimeFormatOptions = {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		timeZone: 'CET',
		hour12: false
	}
	if (hoursMinutes) {
		dateFormat.hour = 'numeric'
		dateFormat.minute = 'numeric'
	}
	return date.toLocaleString('nl-NL', dateFormat).replace(/\./, '')
}

function getWeekAndYear(date: Date): { year: number, week: number } {
	let d = new Date(date)
	d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)) // make sunday's day number 7
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
	// @ts-ignore
	const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
	return { year: d.getUTCFullYear(), week: weekNo };
}

// weeknumber starts from 1
function getWeekRange(year: number, week: number): { start: Time.Date, end: Time.Date } {
	const d = new Date("Jan 01, " + year + " 01:00:00")
	const firstDay = new Date(year, 0, 1).getDay();
	const w = d.getTime() - (3600000 * 24 * (firstDay - 1)) + 604800000 * (week - 1)
	const start = new Date(w)
	const end = new Date(w + 518400000)
	return {
		start: formatDate(start, false),
		end: formatDate(end, false),
	}
}

function reportsToWeekdata(reports: DB.LogtimeReport[]): UI.Weekdata[] {
	let weekDatas: UI.Weekdata[] = []
	for (const report of reports) {
		const { year, week } = getWeekAndYear(new Date(report.d))
		const weekData = weekDatas.find(x => x.year === year && x.week === week)
		if (!weekData)
			weekDatas.push({
				year,
				week,
				...getWeekRange(year, week),
				buildingTime: report.buildingTime,
				clusterTime: report.clusterTime,
			})
		else {
			weekData.buildingTime += report.buildingTime
			weekData.clusterTime += report.clusterTime
		}
	}
	weekDatas = weekDatas.sort((a, b) => b.week - a.week) // last week first
	return weekDatas
}

function toUIlogtimeReport(report: DB.LogtimeReport): UI.LogtimeReport {
	return {
		date: formatDate(new Date(report.d), false),
		buildingTime: report.buildingTime,
		clusterTime: report.clusterTime,
	}
}

function censorEmail(email: string): string { // abcdef@gmail.com --> ab****@gmail.com
	return email.replace(/(.{2})(.*)(?=@)/,
		(gp1, gp2, gp3) => {
			for (let i = 0; i < gp3.length; i++) {
				gp2 += "*"
			} return gp2
		});
}

export class DataBase {
	readonly filePath: fs.PathLike
	#content: DB.Content
	#isPullingMails: boolean

	constructor(fileName: string) {
		this.filePath = fileName
		this.#isPullingMails = false
		if (!fs.existsSync(this.filePath) || fs.statSync(this.filePath).size < 2) {
			const emptyDB: DB.Content = { reports: [], forwardVerifications: [], failedParse: [], lastMailPull: 0 }
			fs.writeFileSync(this.filePath, JSON.stringify(emptyDB))
		}
		this.#content = JSON.parse(fs.readFileSync(this.filePath).toString())!
	}

	async #syncToDisk() {
		await fs.promises.writeFile(this.filePath, JSON.stringify(this.#content))
	}

	async addLogtimeReport(report: DB.LogtimeReport): Promise<void> {
		this.#content.failedParse = this.#content.failedParse.filter(f => f.id != report.mail.id)
		if (this.#content.reports.find(x => x.mail.id == report.mail.id))
			return
		this.#content.reports.push(report)
		await this.#syncToDisk()
	}

	async addForwardVerification(verfication: DB.ForwardVerification): Promise<void> {
		this.#content.failedParse = this.#content.failedParse.filter(f => f.id != verfication.mailID)
		if (this.#content.reports.find(x => x.mail.id == verfication.mailID))
			return
		this.#content.forwardVerifications.push(verfication)
		await this.#syncToDisk()
	}

	#getThisWeek(weekDatas: UI.Weekdata[]): UI.ThisWeek {
		const now = new Date()
		const { week, year } = getWeekAndYear(now)
		let times: { buildingTime: Time.Hours, clusterTime: Time.Hours }
		const weekData = weekDatas.find(x => x.week == week && x.year == year)
		if (weekData)
			times = { buildingTime: weekData.buildingTime, clusterTime: weekData.clusterTime }
		else
			times = { buildingTime: 0, clusterTime: 0 }
		return {
			n: week,
			...getWeekRange(now.getFullYear(), week),
			...times,
		}
	}

	getPersonInfo(login: IntraLogin): UI.User | null {
		const reports: DB.LogtimeReport[] = this.#content.reports.filter(x => x.login == login)
		const weekDatas = reportsToWeekdata(reports)

		let lastUpdate = new Date(0)
		for (const report of reports) {
			const d = new Date(report.mail.d)
			if (d > lastUpdate)
				lastUpdate = d
		}
		return {
			lastUpdate: {
				formatted: formatDate(lastUpdate, true),
				timestamp: lastUpdate
			},
			thisWeek: this.#getThisWeek(weekDatas),
			weeks: weekDatas,
			reports: reports.map(report => toUIlogtimeReport(report)),
			login
		}
	}

	#savedMails(): MailID[] {
		const reports = this.#content.reports.map(report => report.mail.id)
		const verifications = this.#content.forwardVerifications.map(x => x.mailID)
		const failedParse = this.#content.failedParse.map(x => x.id)
		return [...reports, ...verifications, ...failedParse]
	}

	async pullMails(ignorePullTimeout = false): Promise<void> { // TODO ignore mails that are not logtime reports
		if (this.#isPullingMails)
			return
		if (!ignorePullTimeout && Date.now() - this.#content.lastMailPull < 30 * 1000)
			return
		this.#isPullingMails = true
		this.#content.lastMailPull = Date.now()

		const mails: Mail[] = await mailer.getMails(this.#savedMails()) // TODO: paging
		for (const mail of mails) {
			const report: DB.LogtimeReport | null = getLogtimeReport(mail)
			if (report) {
				await this.addLogtimeReport(report)
				continue
			}
			const verification: DB.ForwardVerification | null = getForwardVerification(mail)
			if (verification) {
				this.addForwardVerification(verification)
				continue
			}
			this.#content.failedParse.push(mail)
			await this.#syncToDisk()
			// console.log('could not parse mail', mail) // TODO
		}
		this.#isPullingMails = false
	}

	getForwardVerifications(): { code, from }[] {
		this.#content.forwardVerifications.sort((a, b) => (new Date(b.d)).getTime() - (new Date(a.d)).getTime()) // last email first
		return this.#content.forwardVerifications.map(f => { return { code: f.code, from: censorEmail(f.from) } })
	}
}
