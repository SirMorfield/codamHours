import express from "express"
import path from "path"
import session from 'express-session'
import { v4 as uuid } from 'uuid'
import { authenticate, provider, passport, secrets, UserProfile } from './authentication'

const app = express()
app.set("views", path.join(__dirname, "../views"))
app.set('viewengine', 'ejs')

// const FileStore = require('session-file-store')(session);
app.use(session({
	genid: (req) => {
		return uuid()
	},
	// store: new FileStore(),
	secret: secrets.sessionSecret,
	resave: false,
	saveUninitialized: true
}))

app.use(passport.initialize())
app.use(passport.session())

app.get(`/auth/${provider}/`, passport.authenticate(provider, { scope: ['public'] }))
app.get(`/auth/${provider}/callback`,
	passport.authenticate(provider, {
		successRedirect: '/',
		failureRedirect: `/auth/${provider}`
	}))

app.get('/', authenticate, (req, res) => {
	const user = req.user as UserProfile
	res.send(user.login)
	res.render('index.ejs');
})

app.listen(8080, () => {
	console.log('started')
})
