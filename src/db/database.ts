import fs from 'fs'
import { DB, UI, IntraLogin, Time, MailID, Mail } from '../types'
import * as mailer from './getMails'
import { getLogtimeReport } from './getLogtimeReport'
import { getForwardVerification } from './getForwardVerification'
import { formatDate, getWeekAndYear, getWeekRange } from './dateUtils'

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
	return email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => {
		for (let i = 0; i < gp3.length; i++)
			gp2 += "*"
		return gp2
	})
}

export class DataBase {
	readonly filePath: fs.PathLike
	private _db: DB.Content
	private _isPullingMails: boolean

	constructor(fileName: string) {
		this.filePath = fileName
		this._isPullingMails = false
		if (!fs.existsSync(this.filePath) || fs.statSync(this.filePath).size < 2) {
			const emptyDB: DB.Content = { reports: [], forwardVerifications: [], failedParse: [], lastMailPull: 0 }
			fs.writeFileSync(this.filePath, JSON.stringify(emptyDB))
		}
		this._db = JSON.parse(fs.readFileSync(this.filePath).toString())!
	}

	async #syncToDisk() {
		await fs.promises.writeFile(this.filePath, JSON.stringify(this._db))
	}

	async addLogtimeReport(report: DB.LogtimeReport): Promise<void> {
		this._db.failedParse = this._db.failedParse.filter(f => f.id != report.mail.id)
		if (this._db.reports.find(x => x.mail.id == report.mail.id))
			return
		this._db.reports.push(report)
		await this.#syncToDisk()
	}

	async addForwardVerification(verfication: DB.ForwardVerification): Promise<void> {
		this._db.failedParse = this._db.failedParse.filter(f => f.id != verfication.mailID)
		if (this._db.reports.find(x => x.mail.id == verfication.mailID))
			return
		this._db.forwardVerifications.push(verfication)
		await this.#syncToDisk()
	}

	#getThisWeekLogtimeReports(w: number, y: number, reports: DB.LogtimeReport[]): UI.LogtimeReport[] {
		const thisWeek = reports.filter(l => {
			const { week, year } = getWeekAndYear(new Date(l.d))
			return w == week && y == year
		})
		thisWeek.sort((a, b) => (new Date(b.d)).getTime() - (new Date(a.d)).getTime())
		return thisWeek.map(report => toUIlogtimeReport(report))
	}

	#getThisWeek(weekDatas: UI.Weekdata[], reports: DB.LogtimeReport[]): UI.ThisWeek {
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
			logtimeReports: this.#getThisWeekLogtimeReports(week, year, reports)
		}
	}

	getPersonInfo(login: IntraLogin): UI.User | null {
		const reports: DB.LogtimeReport[] = this._db.reports.filter(x => x.login == login)
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
			thisWeek: this.#getThisWeek(weekDatas, reports),
			weeks: weekDatas,
			reports: reports.map(report => toUIlogtimeReport(report)),
			login
		}
	}

	#savedMails(): MailID[] {
		const reports = this._db.reports.map(report => report.mail.id)
		const verifications = this._db.forwardVerifications.map(x => x.mailID)
		const failedParse = this._db.failedParse.map(x => x.id)
		return [...reports, ...verifications, ...failedParse]
	}

	async pullMails(ignorePullTimeout = false): Promise<void> { // TODO ignore mails that are not logtime reports
		if (this._isPullingMails)
			return
		if (!ignorePullTimeout && Date.now() - this._db.lastMailPull < 30 * 1000)
			return
		this._isPullingMails = true
		this._db.lastMailPull = Date.now()

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
			this._db.failedParse.push(mail)
			await this.#syncToDisk()
			// console.log('could not parse mail', mail) // TODO
		}
		this._isPullingMails = false
	}

	getForwardVerifications(): { code: string, from: string }[] {
		this._db.forwardVerifications.sort((a, b) => (new Date(b.d)).getTime() - (new Date(a.d)).getTime()) // last email first
		const mails = this._db.forwardVerifications.filter(f => (Date.now() - (new Date(f.d)).getTime()) < 4 * 24 * 60 * 60 * 1000) // do not show emails after 4 days
		return mails.map(f => ({ code: f.code, from: censorEmail(f.from) }))
	}
}
