import { DB, MailID, Mail } from '../types'
import * as mailer from './getMails'
import { getLogtimeReport } from './getLogtimeReport'
import { getForwardVerification } from './getForwardVerification'
import { models } from '../models'

function censorEmail(email: string): string { // abcdef@gmail.com --> ab****@gmail.com
	return email.replace(/(.{3})(.*)(?=@)/, (gp1, gp2, gp3) => {
		for (let i = 0; i < gp3.length; i++)
			gp2 += "*"
		return gp2
	})
}

export class DataBase {
	private _isPullingMails: boolean
	private lastMailPull: number

	constructor() {
		this._isPullingMails = false
		this.lastMailPull = 0
	}

	async addLogtimeReport(report: DB.LogtimeReport): Promise<void> {
		console.log('report      \t', report)
		if (await models.LogtimeReport.exists({ 'mail.id': report.mail.id }))
			return
		const newReport = new models.LogtimeReport(report)
		await newReport.save()
	}

	async addForwardVerification(verification: DB.ForwardVerification): Promise<void> {
		const exists = await models.ForwardVerification.exists({ mailID: verification.mailID })
		console.log('verification\t', verification.mailID, exists)
		if (exists)
			return
		const newVerification = new models.ForwardVerification(verification)
		await newVerification.save()
	}

	async addFailedMail(mail: Mail): Promise<void> {
		console.log('failed     \t', mail)
		if (await models.FailedMail.exists({ id: mail.id }))
			return
		const newMail = new models.FailedMail(mail)
		await newMail.save()
	}

	async mailInDatabase(id: MailID): Promise<boolean> {
		if (await models.LogtimeReport.exists({ 'mail.id': id }))
			return true
		if (await models.ForwardVerification.exists({ mailID: id }))
			return true
		if (await models.FailedMail.exists({ id }))
			return true
		return false
	}

	async pullMails(ignorePullTimeout = false): Promise<void> {
		if (this._isPullingMails)
			return
		if (!ignorePullTimeout && Date.now() - this.lastMailPull < 30 * 1000)
			return
		this._isPullingMails = true
		this.lastMailPull = Date.now()

		const mails: Mail[] = await mailer.getMails(this.mailInDatabase)
		for (const mail of mails) {
			const report: DB.LogtimeReport | null = getLogtimeReport(mail)
			if (report) {
				await this.addLogtimeReport(report)
				continue
			}
			const verification: DB.ForwardVerification | null = getForwardVerification(mail)
			if (verification) {
				await this.addForwardVerification(verification)
				continue
			}
			await this.addFailedMail(mail)
		}
		this._isPullingMails = false
	}

	async getForwardVerifications(): Promise<{ code: string, from: string }[]> { // TODO
		const v = await models.ForwardVerification.find().exec()
		v.sort((a, b) => (new Date(b.d)).getTime() - (new Date(a.d)).getTime()) // last email first
		const mails = v.filter(f => (Date.now() - (new Date(f.d)).getTime()) < 4 * 24 * 60 * 60 * 1000) // do not show emails after 4 days
		return mails.map(f => ({ code: f.code, from: censorEmail(f.from) }))
	}
}
