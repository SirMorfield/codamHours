import fs from 'fs'

interface Env {
	clientUID: string,
	clientSecret: string,
	callbackURL: URL,
	authorizationURL: URL,
	tokenURL: URL,
	sessionSecret: string,
	profileURL: URL,
	provider: string,
}
type URL = string

// TODO: validate type?
export const env: Env = JSON.parse(fs.readFileSync('./secrets.json').toString()) as Env
