import express from "express"
import path from "path"
import session from 'express-session'
import { v4 as uuid } from 'uuid'
import { authenticate, provider, passport, secrets } from './authentication'

const app = express()
app.set("views", path.join(__dirname, "../views"))
app.set('viewengine', 'ejs')

// const FileStore = require('session-file-store')(session);
app.use(session({
	genid: (req) => {
		console.log('Inside session middleware genid function')
		console.log(`Request object sessionID from client: ${req.sessionID}`)
		return uuid() // use UUIDs for session IDs
	},
	// store: new FileStore(),
	secret: secrets.sessionSecret,
	resave: false,
	saveUninitialized: true
}))

app.use(passport.initialize())
app.use(passport.session())

app.get(`/auth/${provider}/`, passport.authenticate(provider, { scope: ['profile'] }))
app.get(`/auth/${provider}/callback`,
	passport.authenticate(provider, {
		successRedirect: '/',
		failureRedirect: '/login'
	}))

app.get('/', authenticate, (req, res) => {
	res.render('index.ejs');
})

app.listen(8080, () => {
	console.log('started')
})
