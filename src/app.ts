import express from "express"
import path from "path"
import session from 'express-session'
import { v4 as uuid } from 'uuid'
import { authenticate, passport, UserProfile } from './authentication'
import { env } from "./env"
import { DataBase } from './db/database'

const app = express()
app.set("views", path.join(__dirname, "../views"))
app.set('viewengine', 'ejs')

// const FileStore = require('session-file-store')(session);
app.use(session({
	genid: (req) => {
		return uuid()
	},
	// store: new FileStore(),
	secret: env.sessionSecret,
	resave: false,
	saveUninitialized: true
}))

app.use(passport.initialize())
app.use(passport.session())

app.get(`/auth/${env.provider}/`, passport.authenticate(env.provider, { scope: env.scope }))
app.get(`/auth/${env.provider}/callback`,
	passport.authenticate(env.provider, {
		successRedirect: '/',
		failureRedirect: env.loginRoute
	}))
app.get('/auth/logout', (req, res) => {
	req.logout()
	res.redirect('/')
})

const dataBase = new DataBase("database.json");

(async () => { // TODO
	while (true) {
		await dataBase.pullMails()
		await new Promise((resolve, reject) => setTimeout(resolve, 10 * 60 * 1000))
	}
})()

app.get('/', authenticate, async (req, res) => {
	const user = req.user as UserProfile
	const userData = dataBase.getPersonInfo(user.login)
	if (!userData)
		return res.redirect('/setup')
	res.render('index.ejs', userData)
})

app.get('/setup', authenticate, async (req, res) => {
	const data = {
		forwardVerifications: dataBase.getForwardVerification()
	}
	res.render('setup.ejs', data)
})

const port = process.env['PORT'] || 8080
app.listen(port, () => console.log('app ready on port', port))
