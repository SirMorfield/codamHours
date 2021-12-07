export type Hours = number
export type Epoch = number // TODO
export type IntraLogin = string
export type DateString = string
export type ISOdateString = string

export interface Mail {
	id: string
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
		mailID: string
		from: string
		d: ISOdateString
		login: IntraLogin
		buildingTime: Hours
		clusterTime: Hours
	}
	interface Content {
		reports: DB.LogtimeReport[]
		forwardVerifications: DB.ForwardVerification[]
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
	interface User {
		lastUpdate: {
			formatted: DateString
			timestamp: Date
		}
		weeks: UI.Weekdata[]
		reports: UI.LogtimeReport[]
	}
}
