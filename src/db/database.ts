import fs from 'fs'
import { DB, MailID, Mail } from '../types'
import * as mailer from './getMails'
import { getLogtimeReport } from './getLogtimeReport'
import { getForwardVerification } from './getForwardVerification'

function censorEmail(email: string): string { // abcdef@gmail.com --> ab****@gmail.com
	return email.replace(/(.{3})(.*)(?=@)/, (gp1, gp2, gp3) => {
		for (let i = 0; i < gp3.length; i++)
			gp2 += "*"
		return gp2
	})
}

export class DataBase {
	readonly filePath: fs.PathLike
	readonly _db: DB.Content
	private _isPullingMails: boolean

	constructor(fileName: string) {
		this.filePath = fileName
		this._isPullingMails = false
		const emptyDB: DB.Content = { reports: [], forwardVerifications: [], failedParse: [], lastMailPull: 0 }
		const emptyDBstr: string = JSON.stringify(emptyDB)
		if (!fs.existsSync(this.filePath) || fs.statSync(this.filePath).size < emptyDBstr.length)
			fs.writeFileSync(this.filePath, emptyDBstr)
		this._db = JSON.parse(fs.readFileSync(this.filePath).toString())!
	}

	private async _syncToDisk() {
		await fs.promises.writeFile(this.filePath, JSON.stringify(this._db))
	}

	async addLogtimeReport(report: DB.LogtimeReport): Promise<void> {
		this._db.failedParse = this._db.failedParse.filter(f => f.id != report.mail.id)
		if (this._db.reports.find(x => x.mail.id == report.mail.id))
			return
		this._db.reports.push(report)
		await this._syncToDisk()
	}

	async addForwardVerification(verfication: DB.ForwardVerification): Promise<void> {
		this._db.failedParse = this._db.failedParse.filter(f => f.id != verfication.mailID)
		if (this._db.reports.find(x => x.mail.id == verfication.mailID))
			return
		this._db.forwardVerifications.push(verfication)
		await this._syncToDisk()
	}

	private _savedMails(): MailID[] {
		const reports = this._db.reports.map(report => report.mail.id)
		const verifications = this._db.forwardVerifications.map(x => x.mailID)
		const failedParse = this._db.failedParse.map(x => x.id)
		return [...reports, ...verifications, ...failedParse]
	}

	async pullMails(ignorePullTimeout = false): Promise<void> {
		if (this._isPullingMails)
			return
		if (!ignorePullTimeout && Date.now() - this._db.lastMailPull < 30 * 1000)
			return
		this._isPullingMails = true
		this._db.lastMailPull = Date.now()

		const mails: Mail[] = await mailer.getMails(this._savedMails())
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
			await this._syncToDisk()
		}
		this._isPullingMails = false
	}

	getForwardVerifications(): { code: string, from: string }[] {
		this._db.forwardVerifications.sort((a, b) => (new Date(b.d)).getTime() - (new Date(a.d)).getTime()) // last email first
		const mails = this._db.forwardVerifications.filter(f => (Date.now() - (new Date(f.d)).getTime()) < 4 * 24 * 60 * 60 * 1000) // do not show emails after 4 days
		return mails.map(f => ({ code: f.code, from: censorEmail(f.from) }))
	}
}
