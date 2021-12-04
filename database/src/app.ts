import express from 'express'
import { DataBase } from './database'

const app = express()
const dataBase = new DataBase("database.json")

app.get("/user/:userName", (req, res) => {
	let userName = req.params.userName
	res.send(dataBase.getPersonInfo(userName))
})

app.listen(8081, () => {
	console.log('started')
})
