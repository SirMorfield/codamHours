export type Hours = number
export type Epoch = number // TODO
export type IntraLogin = string
export type DateString = string
export type ISOdateString = string
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
		d: ISOdateString
		login: IntraLogin
		buildingTime: Hours
		clusterTime: Hours
	}
	interface Content {
		reports: DB.LogtimeReport[]
		forwardVerifications: DB.ForwardVerification[]
		lastMailPull: Epoch
	}
}

export namespace UI {
	interface Weekdata {
		year: number
		week: number
		start: DateString
		end: DateString
		buildingTime: Hours
		clusterTime: Hours
	}
	interface LogtimeReport {
		date: DateString
		buildingTime: Hours
		clusterTime: Hours
	}
	interface ThisWeek {
		n: number
		start: DateString
		end: DateString
		buildingTime: Hours
		clusterTime: Hours
	}
	interface User {
		login: IntraLogin
		lastUpdate: {
			formatted: DateString
			timestamp: Date
		}
		thisWeek: DB.ThisWeek
		weeks: UI.Weekdata[]
		reports: UI.LogtimeReport[]
	}
}
