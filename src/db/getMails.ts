import { gmail_v1, google } from 'googleapis'
import base64 from 'base-64'
import { Mail, MailID } from '../types'
import fs from 'fs/promises'
import { env } from '../env'

const fsExists = async path => !!(await fs.stat(path).catch(e => false))
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
const TOKEN_PATH = `${env.envDir}/token.json`

const client = new google.auth.OAuth2(env.web.client_id, env.web.client_secret, env.web.redirect_uris[0])
export const authUrl = client.generateAuthUrl({
	access_type: 'offline',
	scope: SCOPES,
})
let gmail: gmail_v1.Gmail | null = null

export async function saveToken(code: string) {
	const token = await new Promise((resolve, reject) => {
		client.getToken(code, (err, token) => {
			if (err)
				console.error(err)
			resolve(token)
		})
	})
	if (token)
		await fs.writeFile(TOKEN_PATH, JSON.stringify(token))
}

export async function setGmailSuccess(): Promise<boolean> {
	if (!(await fsExists(TOKEN_PATH))) {
		gmail = null
		return false
	}
	let token = JSON.parse((await fs.readFile(TOKEN_PATH)).toString())
	client.setCredentials(token)
	gmail = google.gmail({ version: 'v1', auth: client })
	if ((await listIDs(gmail, 1)) == null)
		gmail = null
	return true
}

interface FullMailID {
	id: string,
	threadId: string,
}

export async function listIDs(gmail: gmail_v1.Gmail, maxResults?: number): Promise<FullMailID[] | null> {
	return new Promise((resolve, reject) => {
		let headers: gmail_v1.Params$Resource$Users$Messages$List = {
			userId: 'me',
			q: 'label:all'
		}
		if (maxResults)
			headers.maxResults = maxResults
		gmail.users.messages.list(headers, (err, res) => {
			if (err) {
				console.error('listIDs failed with', err.message)
				resolve(null)
			}
			resolve(res?.data.messages as FullMailID[] || []);
		})
	})
}

export async function getContent(gmail: gmail_v1.Gmail, id: FullMailID): Promise<Mail | null> {
	return new Promise((resolve, reject) => {
		gmail.users.messages.get({
			userId: 'me',
			id: id.id
		}, (err, res) => {
			if (err) {
				console.log(err)
				resolve(null)
			}
			try {
				const payload = res!.data!.payload!
				const body: string = payload.parts ? payload.parts[0]!.body!.data! : payload.body!.data!
				let decoded = base64.decode(body.replace(/-/g, '+').replace(/_/g, '/'))
				// converting 'Bob Bye <bob.bye@gmai.com>' to 'bob.bye@gmai.com'
				let from = (payload.headers?.find(header => header.name == 'From'))?.value || ''
				if (from.match(/(?<=<)\S+(?=>)/))
					from = from.match(/(?<=<)\S+(?=>)/)![0]!
				const date = (payload.headers?.find(header => header.name == 'Date'))?.value || 0
				const subject = (payload.headers?.find(header => header.name == 'Subject'))?.value || ''
				resolve({
					id: id.id,
					content: decoded,
					from,
					subject,
					d: new Date(date)
				})
			} catch (err) {
				console.error(err)
				resolve(null)
			}
		})
	})
}

export async function getMails(ignore: MailID[] = [], maxResults?: number): Promise<Mail[]> {
	if (!gmail)
		await setGmailSuccess()
	if (!gmail) {
		console.log('gmail client failed')
		return []
	}
	console.log(new Date(), 'getting mails')
	let IDs: FullMailID[] = await listIDs(gmail, maxResults) as FullMailID[]
	IDs = IDs.filter(id => !ignore.includes(id.id))
	const contents: Mail[] = []
	for (const id of IDs) {
		const content: Mail | null = await getContent(gmail, id)
		if (content)
			contents.push(content)
	}
	console.log(new Date(), 'got', contents.length, 'mail contents')
	return contents
}
