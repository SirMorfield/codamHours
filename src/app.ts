import express from "express"
import path from "path"
import cookieSession from 'cookie-session'
const app = express()

// const FileStore = sessionFileStore(session)
import { authenticate, provider, passport } from './authentication'


app.set("views", path.join(__dirname, "../views"))
app.set('viewengine', 'ejs')

app.use(cookieSession({
	maxAge: 24 * 60 * 60 * 1000,
	keys: ['ddgasdgsagasassg3']
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
