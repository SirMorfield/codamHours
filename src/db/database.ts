import { MailID, Mail } from '../types'
import { LogtimeReport, ForwardVerification } from '../models'
import * as mailer from './getMails'
import { getLogtimeReport } from './getLogtimeReport'
import { getForwardVerification } from './getForwardVerification'
import { models, MailPull } from '../models'

function censorEmail(email: string): string { // abcdef@gmail.com --> ab****@gmail.com
	return email.replace(/(.{3})(.*)(?=@)/, (gp1, gp2, gp3) => {
		for (let i = 0; i < gp3.length; i++)
			gp2 += "*"
		return gp2
	})
}

export class DataBase {
	async mailInDatabase(id: MailID): Promise<boolean> {
		if (await models.LogtimeReport.exists({ 'mail.id': id }))
			return true
		if (await models.ForwardVerification.exists({ mailID: id }))
			return true
		if (await models.FailedMail.exists({ id }))
			return true
		return false
	}

	// Preventing mails form being pulled too often
	private async _canPull(): Promise<boolean> {
		const lastPull: MailPull | null = await models.MailPull.findOne().sort({ '_id': -1 }).limit(1)
		if (!lastPull || Date.now() - lastPull.d.getTime() > 40 * 1000) {
			const pull = new models.MailPull({ d: new Date() })
			await pull.save()
			return true
		}
		return false
	}

	async pullMails(ignorePullTimeout = false): Promise<void> {
		if (!ignorePullTimeout && !(await this._canPull()))
			return
		const mails: Mail[] = await mailer.getMails(this.mailInDatabase)
		for (const mail of mails) {
			const report: LogtimeReport | null = getLogtimeReport(mail)
			if (report) {
				await models.LogtimeReport.updateOne({ 'mail.id': report.mail.id }, report, { upsert: true }).exec()
				continue
			}
			const verification: ForwardVerification | null = getForwardVerification(mail)
			if (verification) {
				await models.ForwardVerification.updateOne({ mailID: verification.mailID }, verification, { upsert: true }).exec()
				continue
			}
			await models.FailedMail.updateOne({ id: mail.id }, mail, { upsert: true }).exec()
		}
	}

	async getForwardVerifications(): Promise<{ code: string, from: string }[]> { // TODO
		const v = await models.ForwardVerification.find().exec()
		v.sort((a, b) => (new Date(b.d)).getTime() - (new Date(a.d)).getTime()) // last email first
		const mails = v.filter(f => (Date.now() - (new Date(f.d)).getTime()) < 4 * 24 * 60 * 60 * 1000) // do not show emails after 4 days
		return mails.map(f => ({ code: f.code, from: censorEmail(f.from) }))
	}
}
