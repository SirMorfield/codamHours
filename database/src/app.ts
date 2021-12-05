import express from 'express'
import { getLogtimeReport } from './addMailsToDatabase'
import { DataBase } from './database'
import { getMails, Mail } from './getMails'

const app = express()
const dataBase = new DataBase("database.json")

async function pullMails() {
	const mails: Mail[] = await getMails(42)// TODO: paging
	for (const mail of mails) {
		const report = getLogtimeReport(mail)
		if (report)
			await dataBase.addDay(report.login, report.epoch, report.buildingTime)
	}
}

(async () => { // TODO
	while (true) {
		await pullMails()
		await new Promise((resolve, reject) => setTimeout(resolve, 10 * 60 * 1000))
	}
})()

app.get("/user/:userName", (req, res) => {
	let userName = req.params.userName
	res.send(dataBase.getPersonInfo(userName))
})

const port = process.env['PORT'] || 8081
app.listen(port, () => console.log('database ready on port', port))
