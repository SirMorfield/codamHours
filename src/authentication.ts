import passport from 'passport'
import { OAuth2Strategy } from 'passport-oauth'
import { env } from './env'
import fetch from 'node-fetch'
import { models, UserProfile } from './models'

export function authenticate(req, res, next) {
	if (!req.user) {
		res.redirect(env.loginRoute)
	} else {
		next()
	}
}

passport.serializeUser((user, done) => {
	// @ts-ignore
	done(null, user.id) // i do not know why ts thinks this is a Express.user instead of a UserProfile
})

passport.deserializeUser(async (id, done) => {
	const user = await models.UserProfile.findOne({ id }).exec()
	done(null, user)
})

async function getProfile(accessToken: string, refreshToken: string): Promise<UserProfile | null> {
	try {
		const response = await fetch(env.profileURL, {
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
	authorizationURL: env.authorizationURL,
	tokenURL: env.tokenURL,
	clientID: env.clientUID,
	clientSecret: env.clientSecret,
	callbackURL: env.callbackURL,
	// passReqToCallback: true
},
	async (accessToken, refreshToken, _profile, done) => { // fires when user clicked allow
		const newUser = await getProfile(accessToken, refreshToken)
		if (!newUser)
			return done('cannot get user info', null)
		await models.UserProfile.updateOne({ id: newUser.id }, newUser, { upsert: true }).exec()
		done(null, newUser)
	}
)
passport.use(env.provider, client)

export { passport }
