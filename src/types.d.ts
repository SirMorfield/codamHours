export type IntraLogin = string

export namespace Time {
	type Date = string 		// ma 4 okt
	type ISOstring = string // "2021-12-08T21:57:09.019Z"
	type DayTime = string	// ma 4 okt 17:11
	type Epoch = number		// 1639000672586
	type Hours = number		// 5.5
}


export type MailID = string

export interface Mail {
	id: MailID
	content: string
	from: string
	subject: string
	d: Date
}

export namespace DB {
	interface ForwardVerification {
		code: string
		from: string
		mailID: MailID
		d: Date
	}
	interface LogtimeReport {
		mail: {
			id: MailID
			d: Time.ISOstring
		}
		from: string
		d: Time.ISOstring // the date of the report
		login: IntraLogin
		buildingTime: Time.Hours
		clusterTime: Time.Hours
	}
	interface Content {
		reports: DB.LogtimeReport[]
		forwardVerifications: DB.ForwardVerification[]
		failedParse: Mail[]
		lastMailPull: Time.Epoch
	}
}

export namespace UI {
	interface Weekdata {
		year: number
		week: number
		start: Time.Date
		end: Time.Date
		buildingTime: Time.Hours
		clusterTime: Time.Hours
	}
	interface LogtimeReport {
		date: Time.Date
		buildingTime: Time.Hours
		clusterTime: Time.Hours
	}
	interface ThisWeek {
		n: number
		start: Time.Date
		end: Time.Date
		buildingTime: Time.Hours
		clusterTime: Time.Hours
		logtimeReports: UI.LogtimeReport[]
	}
	interface User {
		login: IntraLogin
		lastUpdate: {
			formatted: Time.Date
			timestamp: Date
		}
		thisWeek: DB.ThisWeek
		weeks: UI.Weekdata[]
		reports: UI.LogtimeReport[]
	}
}
