import fs from 'fs'
import readline from 'readline'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import base64 from 'base-64'

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
const TOKEN_PATH = 'token.json'
const CREDENTIALS_PATH = 'credentials.json'

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

async function getClient(): Promise<OAuth2Client> {
	const credentials = JSON.parse((await fs.promises.readFile(CREDENTIALS_PATH)).toString())
	const { client_secret, client_id, redirect_uris } = credentials.web
	const client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

	let token
	if (!fs.existsSync(TOKEN_PATH)) {
		token = getNewToken(client)
		await fs.promises.writeFile(TOKEN_PATH, JSON.stringify(token))
	}
	else
		token = JSON.parse((await fs.promises.readFile(TOKEN_PATH)).toString())
	client.setCredentials(token)
	return client
}

interface MailID {
	id: string,
	threadId: string,
}

async function listIDs(auth: OAuth2Client, maxResults: number): Promise<MailID[]> {
	const gmail = google.gmail({ version: 'v1', auth })
	return new Promise((resolve, reject) => {
		gmail.users.messages.list({
			userId: 'me',
			q: 'label:inbox',
			maxResults
		}, (err, res) => {
			if (err)
				reject(err)
			resolve(res!.data.messages as MailID[] || []);
		})
	})
}

export interface Mail {
	content: string,
	from: string,
	date: Date
}

async function getContent(auth: OAuth2Client, id: MailID): Promise<Mail | null> {
	const gmail = google.gmail({ version: 'v1', auth })
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
			const payload = res!.data!.payload!
			let body = payload.parts![0]!.body!.data
			let decoded = base64.decode(body!.replace(/-/g, '+').replace(/_/g, '/'));
			const from = (payload.headers!.find(header => header.name == 'From'))?.value!
			const date = (payload.headers!.find(header => header.name == 'Date'))?.value!
			// TODO: protect?
			resolve({
				content: decoded,
				from,
				date: new Date(date)
			})
		})
	})
}

let auth
export async function getMails(maxResults: number): Promise<Mail[]> {
	if (!auth)
		auth = await getClient()
	const IDs: MailID[] = await listIDs(auth, maxResults)
	const contents: Mail[] = []
	for (const id of IDs) {
		contents.push(await getContent(auth, id) as Mail) // TODO: protect?
	}
	// console.log('got', contents.length, 'mail contents')
	return contents
}
