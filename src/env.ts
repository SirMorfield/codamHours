import fs from 'fs'
import { IntraLogin } from './types'

interface Web {
	client_id: string
	project_id: string
	auth_uri: string
	token_uri: string
	auth_provider_x509_cert_url: string
	client_secret: string
	redirect_uris: string[]
	javascript_origins: string[]
}

interface Env {
	clientUID: string
	clientSecret: string
	callbackURL: URL
	authorizationURL: URL
	tokenURL: URL
	sessionSecret: string
	profileURL: URL
	provider: string
	loginRoute: string
	scope: string[]
	web: Web
	mailSheetID: string,

	envDir: fs.PathLike
	logtimeReportSender: string
	mongoUrl: string
	admins: IntraLogin[]
}
type URL = string

// TODO: validate type?
export const env: Env = {
	...JSON.parse(fs.readFileSync('./env/env.json').toString()),
	...JSON.parse(fs.readFileSync('./env/credentials.json').toString()),
	envDir: './env/',
	mongoUrl: 'mongodb://mongo:27017/',
	admins: ['jkoers'],
}
