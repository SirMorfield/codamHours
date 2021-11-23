import passport from 'passport'
import { OAuth2Strategy } from 'passport-oauth'
import { env } from './env'

export function authenticate(req, res, next) {
	if (!req.user) {
		res.redirect(env.loginRoute);
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


passport.serializeUser((user, done) => {
	done(null, user.id);
})

passport.deserializeUser((id, done) => {
	const user = users.find((user) => user.id === id)
	done(null, user);
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
		let existingUser = users.find((user) => user.id === newUser.id)
		if (!existingUser) {
			users.push(newUser)
			existingUser = newUser
		}
		done(null, existingUser);
	}
)
passport.use(env.provider, client)

export { passport }


// router.get(`/${provider}/callback`,
// 	passport.authenticate(provider), (req, res) => {
// 		console.log(users)
// 		res.send('logged in')
// 	})
