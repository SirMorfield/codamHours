export type IntraLogin = string

export namespace Time {
	type Date = string
	type ISO = string
	type DayTime = string
	type Epoch = number
	type Hours = number

}

export type MailID = string

export interface Mail {
	id: MailID
	content: string
	from: string
	d: Date
}

export namespace DB {
	interface ForwardVerification {
		code: string
		from: string
	}
	interface LogtimeReport {
		mailID: MailID
		from: string
		d: Time.ISO
		login: IntraLogin
		buildingTime: Time.Hours
		clusterTime: Time.Hours
	}
	interface Content {
		reports: DB.LogtimeReport[]
		forwardVerifications: DB.ForwardVerification[]
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
