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
	loginRoute: string,
	scope: string[]
}
type URL = string

// TODO: validate type?
export const env: Env = JSON.parse(fs.readFileSync('./env.json').toString()) as Env
