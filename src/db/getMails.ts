import readline from 'readline'
import { gmail_v1, google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import base64 from 'base-64'
import { Mail, MailID } from '../types'
import fs from 'fs/promises'
import { env } from '../env'

const fsExists = async path => !!(await fs.stat(path).catch(e => false))
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
const TOKEN_PATH = `${env.envDir}/token.json`

async function getNewToken(client): Promise<Object> {
	const authUrl = client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	})
	console.log('Authorize this app by visiting this url:', authUrl)
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
	return new Promise((resolve, reject) => {
		rl.question('Enter the code from that page here: ', (code) => {
			rl.close()
			client.getToken(code, (err, token) => {
				if (err)
					reject(err)
				client.setCredentials(token)
				resolve(token)
			})
		})
	})
}

export async function getAuthClient(): Promise<OAuth2Client> {
	const { client_secret, client_id, redirect_uris } = env.web
	const client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

	let token
	if (!(await fsExists(TOKEN_PATH))) {
		token = getNewToken(client)
		await fs.writeFile(TOKEN_PATH, JSON.stringify(token))
	}
	else
		token = JSON.parse((await fs.readFile(TOKEN_PATH)).toString())
	client.setCredentials(token)
	return client
}

interface FullMailID {
	id: string,
	threadId: string,
}

export async function listIDs(gmail: gmail_v1.Gmail, maxResults?: number): Promise<FullMailID[]> {
	return new Promise((resolve, reject) => {
		let headers: gmail_v1.Params$Resource$Users$Messages$List = {
			userId: 'me',
			q: 'label:inbox'
		}
		if (maxResults)
			headers.maxResults = maxResults
		gmail.users.messages.list(headers, (err, res) => {
			if (err) {
				console.error(err)
				resolve([])
			}
			resolve(res!.data.messages as FullMailID[] || []);
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
			// TODO: what if there is more parts? for now a single part can hold a email length of 48000 chars
			try {
				const payload = res!.data!.payload!
				const body: string = payload.parts ? payload.parts[0]!.body!.data! : payload.body!.data!
				let decoded = base64.decode(body.replace(/-/g, '+').replace(/_/g, '/'))
				// converting 'Bob Bye <bob.bye@gmai.com>' to 'bob.bye@gmai.com'
				let from = (payload.headers!.find(header => header.name == 'From'))?.value || ''
				if (from.match(/(?<=<)\S+(?=>)/))
					from = from.match(/(?<=<)\S+(?=>)/)![0]!
				const date = (payload.headers!.find(header => header.name == 'Date'))?.value || ''
				const subject = (payload.headers!.find(header => header.name == 'Subject'))?.value || ''
				// TODO: protect?
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

let gmail: gmail_v1.Gmail
export async function getMails(ignore: MailID[] = [], maxResults?: number): Promise<Mail[]> {
	if (!gmail)
		gmail = google.gmail({ version: 'v1', auth: await getAuthClient() })
	console.log('getting mails')
	let IDs: FullMailID[] = await listIDs(gmail, maxResults)
	IDs = IDs.filter(id => !ignore.includes(id.id))
	const contents: Mail[] = []
	for (const id of IDs) {
		const content: Mail | null = await getContent(gmail, id)
		if (content)
			contents.push(content) // TODO: protect?
	}
	console.log('got', contents.length, 'mail contents')
	return contents
}
