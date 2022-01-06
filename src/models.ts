import { IntraLogin, Time, MailID } from './types'
import mongoose, { Schema, Document } from 'mongoose'

export interface ForwardVerification extends Document {
	code: string
	from: string
	mailID: MailID
	d: Date
}
const ForwardVerificationSchema: Schema = new Schema({
	code: { type: String, required: true },
	from: { type: String, required: true },
	mailID: { type: String, required: true },
	d: { type: Date, required: true },
})

export interface LogtimeReport extends Document {
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
const LogtimeReportSchema: Schema = new Schema({
	mail: {
		id: { type: String, required: true },
		d: { type: String, required: true },
	},
	from: { type: String, required: true },
	d: { type: String, required: true },// the date of the report
	login: { type: String, required: true },
	buildingTime: { type: Number, required: true },
	clusterTime: { type: Number, required: true },
})


export interface Mail {
	id: MailID
	content: string
	from: string
	subject: string
	d: Date
}
const MailSchema: Schema = new Schema({
	id: { type: String, required: true },
	content: { type: String, required: true },
	from: { type: String, required: true },
	subject: { type: String, required: true },
	d: { type: Date, required: true },
})

export interface UserProfile {
	id: number,
	login: string,
	first_name: string,
	displayname: string,
	accessToken: string,
	refreshToken: string,
}
const UserProfileSchema = new Schema({
	id: { type: Number, required: true },
	login: { type: String, required: true },
	first_name: { type: String, required: true },
	displayname: { type: String, required: true },
	accessToken: { type: String, required: true },
	refreshToken: { type: String, required: true },
})

const models = {
	ForwardVerification: mongoose.model<ForwardVerification>('ForwardVerifications', ForwardVerificationSchema),
	LogtimeReport: mongoose.model<LogtimeReport>('LogtimeReports', LogtimeReportSchema),
	FailedMail: mongoose.model<Mail>('FailedMails', MailSchema),
	UserProfile: mongoose.model<UserProfile>('UserProfiles', UserProfileSchema),
}

export { models }
