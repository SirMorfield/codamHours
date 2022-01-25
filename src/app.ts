import express from "express"
import path from "path"
import session from 'express-session'
import { v4 as uuid } from 'uuid'
import { passport } from './authentication'
import { env } from "./env"
import { DataBase } from './db/database'
import { authUrl, saveToken, setGmailSuccess } from "./db/getMails"
import { getPersonInfo } from './db/ui'
import fs from 'fs'
import mongoose from 'mongoose'
import MongoStore from 'connect-mongo'
import { UserProfile } from './models'
import { authenticate } from './authentication'

const opt: mongoose.ConnectOptions = {
}
mongoose.connect(env.mongoUrl, opt, () => {
	console.log('connected to database')
})

const app = express()
app.set("views", path.join(__dirname, "../views"))
app.set('viewengine', 'ejs')

const collectionName = 'session'
app.use(session({
	genid: (req) => {
		return uuid()
	},
	store: MongoStore.create({ mongoUrl: env.mongoUrl + 'session', collectionName }),
	secret: env.sessionSecret,
	resave: false,
	saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())

app.get(`/auth/${env.provider}/`, passport.authenticate(env.provider, { scope: env.scope }))
app.get(`/auth/${env.provider}/callback`,
	passport.authenticate(env.provider, {
		successRedirect: '/setup',
		failureRedirect: env.loginRoute
	}))

app.get('/auth/logout', (req, res) => { // TODO: doesn't work
	req.logout()
	res.render('loggedOut.ejs')
})

//@ts-ignore
const gmailAuthPath = env.web.redirect_uris[0]!.split('/').at(-1) // 'abn423sd'
app.get(`/AUTHGMAIL${gmailAuthPath}`, (req, res) => {
	res.redirect(authUrl)
})

app.get(`/${gmailAuthPath}`, async (req, res) => {
	await saveToken(req.query['code'] as string)
	const succes = await setGmailSuccess()
	res.send(succes ? 'success' : 'failure')
})

const dataBase = new DataBase();

(async () => {
	while (true) {
		await dataBase.pullMails()
		await new Promise((resolve, reject) => setTimeout(resolve, 2 * 60 * 1000))
	}
})()

app.get('/', authenticate, async (req, res) => {
	const user = req.user as UserProfile
	const userData = await getPersonInfo(user.login)
	res.render('index.ejs', userData)
})

app.get('/setup', authenticate, async (req, res) => {
	const user = req.user as UserProfile
	if (user && (await getPersonInfo(user.login)).reports.length > 0) {
		res.redirect('/')
		return
	}

	const data = {
		// forwardVerifications: req.user ? dataBase.getForwardVerifications() : [],
		forwardVerifications: await dataBase.getForwardVerifications(),
		loginRoute: env.loginRoute,
	}
	res.render('setup.ejs', data)
})

app.get('/users/:login', authenticate, async (req, res) => {
	const user = req.user as UserProfile
	if (!env.admins.includes(user.login)) {
		res.send('unauthorized')
		return
	}
	if (req.params['login']?.length == 0) {
		res.send('no login provided, use eg. &loging=jkoers')
		return
	}
	const userData = await getPersonInfo(req.params['login'])
	res.send(userData)
})

app.get('/mailfilterfile', (req, res) => {
	const file = '/app/public/logtimeReportForwarding.xml'
	res.setHeader('Content-disposition', 'attachment; filename=' + path.basename(file))
	res.setHeader('Content-type', 'XML')
	let filestream = fs.createReadStream(file)
	filestream.pipe(res)
	// You would thing that this is easy right? Well nooo Safari gives a "no rss feed installed" error
	// res.attachment('/app/logtimeReportForwarding.xml')
})

const port = process.env['PORT'] || 8080
app.listen(port, () => console.log('app ready on port', port))
