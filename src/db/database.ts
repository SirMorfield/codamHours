import fs from 'fs'
import { LogtimeReport } from './addMailsToDatabase'

interface DatabasePerson {
	lastUpdate: number,
	weeks: {
		year: number,
		week: number,
		hours: number,
	}[],
	mails: LogtimeReport[]
}

interface PersonData {
	lastUpdate: {
		formatted: DateString,
		timestamp: number,
	},
	weeks: {
		week: number,
		start: DateString,
		end: DateString,
		hours: number,
	}[],
	mails: LogtimeReport[],
}

interface DatabaseContent {
	[key: string]: DatabasePerson
}

export type IntraLogin = string
type DateString = string

export class DataBase {
	readonly filePath: fs.PathLike
	#content: DatabaseContent

	constructor(fileName: string) {
		this.filePath = fileName
		if (!fs.existsSync(this.filePath))
			fs.writeFileSync(this.filePath, '{}')
		this.#content = JSON.parse(fs.readFileSync(this.filePath).toString())!
	}

	async #syncToDisk() {
		await fs.promises.writeFile(this.filePath, JSON.stringify(this.#content))
	}

	#formatEpoch(epoch: number, hoursMinutes: boolean = true): DateString {
		const dateFormat: Intl.DateTimeFormatOptions = {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			timeZone: 'CET',
			hour12: false
		}
		if (hoursMinutes) {
			dateFormat.hour = 'numeric'
			dateFormat.minute = 'numeric'
		}
		return (new Date(epoch)).toLocaleString('nl-NL', dateFormat)
	}

	#getWeekAndYear(epoch: number): [year: number, week: number] {
		let d = new Date(epoch)
		d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
		d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)) // make sunday's day number 7
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
		// @ts-ignore
		const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
		return [d.getUTCFullYear(), weekNo];
	}

	// weeknumber starts from 1
	#getWeekRange(year: number, week: number): { start: DateString, end: DateString } {
		const d = new Date("Jan 01, " + year + " 01:00:00")
		const firstDay = new Date(year, 0, 1).getDay();
		const w = d.getTime() - (3600000 * 24 * (firstDay - 1)) + 604800000 * (week - 1)
		const start = new Date(w)
		const end = new Date(w + 518400000)
		return {
			start: this.#formatEpoch(start.getTime(), false),
			end: this.#formatEpoch(end.getTime(), false),
		}
	}

	async #createIfUserDoesntExist(login: IntraLogin) {
		if (this.#content[login])
			return
		this.#content[login] = {
			lastUpdate: Date.now(),
			weeks: [],
			mails: []
		}
		await this.#syncToDisk()
	}

	async addLogtimeReport(report: LogtimeReport): Promise<void> {
		await this.#createIfUserDoesntExist(report.login)
		const personData: DatabasePerson = this.#content[report.login]!
		if (report.epoch > personData.lastUpdate)
			personData.lastUpdate = report.epoch

		const [week, year] = this.#getWeekAndYear(report.epoch)
		const weekData = personData.weeks.find(x => x.year === year && x.week === week)
		if (!weekData)
			personData.weeks.push({
				week: week,
				year: year,
				hours: report.buildingTime,
			})
		else
			weekData.hours += report.buildingTime
		personData.mails.push(report)
		await this.#syncToDisk()
	}

	getPersonInfo(login: IntraLogin): PersonData | null {
		const personData: DatabasePerson = this.#content[login]!
		if (!personData)
			return null
		personData.weeks = personData.weeks.sort((a, b) => b.week - a.week) // last week first
		return {
			lastUpdate: {
				formatted: this.#formatEpoch(personData.lastUpdate),
				timestamp: personData.lastUpdate
			},
			weeks: personData.weeks.map((week) => {
				console.log(week)
				return {
					week: week.week,
					...this.#getWeekRange(week.year, week.week),
					hours: week.hours,
				}
			}),
			mails: personData.mails,
		}
	}
}
