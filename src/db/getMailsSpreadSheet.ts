import { google, sheets_v4 } from 'googleapis'
import { env } from '../env'
import { Mail, MailID } from '../types'


export class GetMails {
	sheets: sheets_v4.Sheets
	constructor(sheets: sheets_v4.Sheets) {
		this.sheets = sheets
	}

	async get(): Promise<Mail[]> {
		return new Promise((resolve) => {
			const opt = {
				spreadsheetId: env.mailSheetID,
				range: 'Sheet1!A:G',
			}
			this.sheets.spreadsheets.values.get(opt, (err, res) => {
				if (err) {
					console.log(err)
					resolve([])
				}
				const rows = res?.data
				console.log(rows)
				resolve([])
			})
		})
	}

}

export async function getMails(isInDb: (id: MailID) => Promise<boolean>, maxResults?: number): Promise<GetMails> {
	const auth = new google.auth.GoogleAuth({ keyFile: 'keys.json', scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
	const client = await auth.getClient()
	const sheets = google.sheets({ version: 'v4', auth: client })
	return new GetMails(sheets)
}
