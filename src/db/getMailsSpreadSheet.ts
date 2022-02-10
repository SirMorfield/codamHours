import { google, sheets_v4 } from 'googleapis'
import { env } from '../env'
import { Mail, MailID } from '../types'

//date	subject	body	url	from	message id	id
async function getSpreadsheet(client): Promise<string[][]> {
	return new Promise((resolve) => {
		const sheets = google.sheets({ version: 'v4', auth: client })
		const opt = {
			spreadsheetId: env.mailSheetID,
			range: 'Sheet1!A:G',
		}
		sheets.spreadsheets.values.get(opt, (err, res) => {
			if (err) {
				console.log(err)
				resolve([])
			}
			const rows = res?.data.values
			console.log(rows)
			resolve(rows)
		})
	})
}

const auth = new google.auth.GoogleAuth({ keyFile: 'keys.json', scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
let client
export async function getMails(isInDb?: (id: MailID) => Promise<boolean>, maxResults?: number): Promise<Mail[]> {
	if (!client)
		client = await auth.getClient()
	const sheet: string[][] = await getSpreadsheet(client)
	const mails = sheet.map(line => ({
		id: line[6]!,
		content: line[2]!,
		from: line[4]!,
		subject: line[1]!,
		d: new Date(line[0]!),
	}))
	return mails
}
