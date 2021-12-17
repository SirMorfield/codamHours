import { Time } from '../types'

export function formatDate(date: Date, hoursMinutes: boolean = true): Time.Date {
	const dateFormat: Intl.DateTimeFormatOptions = {
		weekday: 'short',
		month: 'short',
		day: '2-digit',
		timeZone: 'CET',
		hour12: false
	}
	if (hoursMinutes) {
		dateFormat.hour = 'numeric'
		dateFormat.minute = 'numeric'
	}
	return date.toLocaleString('en-NL', dateFormat).replace(/\.|,/, '')
}

export function getWeekAndYear(date: Date): { year: number, week: number } {
	const year = date.getFullYear()
	const day = new Date(year, 0, 1).getDay()
	const firstMonday = day == 1 ? day : 9 - day
	const s = Math.floor((date.valueOf() - new Date(year, 0, firstMonday).valueOf()) / (7 * 24 * 60 * 60 * 1000)) + 1
	if (s == 0)
		return getWeekAndYear(new Date(year - 1, 11, 31))
	return { year: year, week: s }
}

// weeknumber starts from 1, weeks start on monday
export function getWeekRange(year: number, week: number): { start: Time.Date, end: Time.Date } {
	const d = new Date(year, 0, week * 7)
	const w = d.valueOf() - (d.getDay() - 1) * 24 * 60 * 60 * 1000
	const start = new Date(w)
	const end = new Date(w + 6 * 24 * 60 * 60 * 1000)
	return {
		start: formatDate(start, false),
		end: formatDate(end, false),
	}
}
