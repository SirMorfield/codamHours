import { DB, UI, IntraLogin, Time } from '../types'
import { formatDate, getWeekAndYear, getWeekRange } from './dateUtils'
import { models } from '../models'

function reportsToWeekdata(reports: DB.LogtimeReport[]): UI.Weekdata[] {
	let weekDatas: UI.Weekdata[] = []
	for (const report of reports) {
		const { year, week } = getWeekAndYear(new Date(report.d))
		const weekData = weekDatas.find(x => x.year === year && x.week === week)
		if (!weekData)
			weekDatas.push({
				year,
				week,
				...getWeekRange(year, week),
				buildingTime: report.buildingTime,
				clusterTime: report.clusterTime,
			})
		else {
			weekData.buildingTime += report.buildingTime
			weekData.clusterTime += report.clusterTime
		}
	}
	weekDatas = weekDatas.sort((a, b) => b.week - a.week) // last week first
	return weekDatas
}

function toUIlogtimeReport(report: DB.LogtimeReport): UI.LogtimeReport {
	return {
		date: formatDate(new Date(report.d), false),
		buildingTime: report.buildingTime,
		clusterTime: report.clusterTime,
	}
}

function getThisWeekLogtimeReports(w: number, y: number, reports: DB.LogtimeReport[]): UI.LogtimeReport[] {
	const thisWeek = reports.filter(l => {
		const { week, year } = getWeekAndYear(new Date(l.d))
		return w == week && y == year
	})
	thisWeek.sort((a, b) => (new Date(b.d)).getTime() - (new Date(a.d)).getTime())
	return thisWeek.map(report => toUIlogtimeReport(report))
}

function getThisWeek(weekDatas: UI.Weekdata[], reports: DB.LogtimeReport[]): UI.ThisWeek {
	const now = new Date()
	const { week, year } = getWeekAndYear(now)
	let times: { buildingTime: Time.Hours, clusterTime: Time.Hours }
	const weekData = weekDatas.find(x => x.week == week && x.year == year)
	if (weekData)
		times = { buildingTime: weekData.buildingTime, clusterTime: weekData.clusterTime }
	else
		times = { buildingTime: 0, clusterTime: 0 }
	return {
		n: week,
		...getWeekRange(now.getFullYear(), week),
		...times,
		logtimeReports: getThisWeekLogtimeReports(week, year, reports)
	}
}

export async function getPersonInfo(login: IntraLogin): Promise<UI.User | null> {
	const reports: DB.LogtimeReport[] = await models.LogtimeReport.find({ login }).exec()

	const weekDatas = reportsToWeekdata(reports)
	reports.sort((a, b) => (new Date(b.d)).getTime() - (new Date(a.d)).getTime()) // last date first

	return {
		lastUpdate: {
			formatted: reports.length > 0 ? formatDate(new Date(reports[0]!.d), true) : 'never',
			timestamp: reports.length > 0 ? new Date(reports[0]!.d) : new Date(0),
		},
		thisWeek: getThisWeek(weekDatas, reports),
		weeks: weekDatas,
		reports: reports.map(report => toUIlogtimeReport(report)),
		login
	}
}
