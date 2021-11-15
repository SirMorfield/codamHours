import passport from 'passport'
import { OAuth2Strategy } from 'passport-oauth'
import fs from 'fs'
import { v4 as uuid } from 'uuid'


export const provider = '42'
export function authenticate(req, res, next) {
	if (!req.user) {
		res.redirect(`/auth/${provider}`);
	} else {
		next();
	}
}

interface User {
	id: string,
}
const users: any[] = []

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
	console.log('serialize', user)
	done(null, user.id);
})

passport.deserializeUser((id, done) => {
	console.log('deserialize', id)
	const user = users.find((user) => user.id === id)
	done(null, user);
})

passport.use(provider, new OAuth2Strategy({
	authorizationURL: secrets.authorizationURL,
	tokenURL: secrets.tokenURL,
	clientID: secrets.clientUID,
	clientSecret: secrets.clientSecret,
	callbackURL: secrets.callbackURL,
	// passReqToCallback: true
},
	(accessToken, refreshToken, profile, done) => { // fires when user clicked allow
		console.log('allow', accessToken, refreshToken, profile)
		let user = users.find((user) => user.id === refreshToken)
		if (!user) {
			users.push({ id: refreshToken })
			user = users.find((user) => user.id === refreshToken)
		}
		done(null, user);
	}
))

export { passport }


// router.get(`/${provider}/callback`,
// 	passport.authenticate(provider), (req, res) => {
// 		console.log(users)
// 		res.send('logged in')
// 	})
