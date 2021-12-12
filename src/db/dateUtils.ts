import { Time } from '../types'

export function formatDate(date: Date, hoursMinutes: boolean = true): Time.Date {
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
	return date.toLocaleString('en-NL', dateFormat).replace(/\./, '')
}

export function getWeekAndYear(date: Date): { year: number, week: number } {
	let d = new Date(date)
	d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)) // make sunday's day number 7
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
	// @ts-ignore
	const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
	return { year: d.getUTCFullYear(), week: weekNo };
}

// weeknumber starts from 1
export function getWeekRange(year: number, week: number): { start: Time.Date, end: Time.Date } {
	const d = new Date("Jan 01, " + year + " 01:00:00")
	const firstDay = new Date(year, 0, 1).getDay();
	const w = d.getTime() - (3600000 * 24 * (firstDay - 1)) + 604800000 * (week - 1)
	const start = new Date(w)
	const end = new Date(w + 518400000)
	return {
		start: formatDate(start, false),
		end: formatDate(end, false),
	}
}
