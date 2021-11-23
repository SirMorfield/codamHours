import express from 'express'
import { DataBase } from './database'

const app = express()
const dataBase = new DataBase("database.json")

app.get("/user/:userName", (req, res) => {
	let userName = req.params.userName
	res.send(dataBase.getPersonInfo(userName))
})

const port = process.env['PORT'] || 8081
app.listen(port, () => console.log('database ready on port', port))
