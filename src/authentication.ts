import passport from 'passport'
import { OAuth2Strategy } from 'passport-oauth'
import fs from 'fs'
import fetch from 'node-fetch'

export const provider = '42'
export function authenticate(req, res, next) {
	if (!req.user) {
		res.redirect(`/auth/${provider}`);
	} else {
		next();
	}
}

export interface UserProfile {
	id: number,
	login: string,
	first_name: string,
	displayname: string,
	accessToken: string,
	refreshToken: string,
}
const users: UserProfile[] = []

type URL = string

interface Secrets {
	clientUID: string,
	clientSecret: string,
	callbackURL: URL,
	authorizationURL: URL,
	tokenURL: URL,
	sessionSecret: string,
}
export const secrets = JSON.parse(fs.readFileSync('./secrets.json').toString()) as Secrets

passport.serializeUser((user, done) => {
	done(null, user.id);
})

passport.deserializeUser((id, done) => {
	const user = users.find((user) => user.id === id)
	done(null, user);
})

async function getProfile(accessToken: string, refreshToken: string): Promise<UserProfile | null> {
	try {
		const response = await fetch("https://api.intra.42.fr/v2/me", {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		})
		const json = await response.json()
		return {
			id: json.id,
			login: json.login,
			first_name: json.first_name,
			displayname: json.displayname,
			accessToken,
			refreshToken,
		}
	} catch (err) { return null }
}

const client = new OAuth2Strategy({
	authorizationURL: secrets.authorizationURL,
	tokenURL: secrets.tokenURL,
	clientID: secrets.clientUID,
	clientSecret: secrets.clientSecret,
	callbackURL: secrets.callbackURL,
	// passReqToCallback: true
},
	async (accessToken, refreshToken, _profile, done) => { // fires when user clicked allow
		const newUser = await getProfile(accessToken, refreshToken)
		if (!newUser)
			return done('cannot get user info', null)
		let existingUser = users.find((user) => user.id === newUser.id)
		if (!existingUser) {
			users.push(newUser)
			existingUser = newUser
		}
		done(null, existingUser);
	}
)
passport.use(provider, client)

export { passport }


// router.get(`/${provider}/callback`,
// 	passport.authenticate(provider), (req, res) => {
// 		console.log(users)
// 		res.send('logged in')
// 	})
