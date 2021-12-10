// import { env } from '../env'
import { DB, IntraLogin, Mail, Time } from '../types'
// const year = parseInt(m.content.match(/(?<=For )\d+/)![0]!)
// const month = parseInt(m.content.match(/(?<=(For \d\d\d\d)-)\d\d/)![0]!)
// const day = parseInt(m.content.match(/(?<=(For \d\d\d\d)-\d\d-)\d\d/)![0]!)
// if (!isFinite(year) || !isFinite(month) || !isFinite(day))
// 	return null
function getHours(timeStr: string | undefined): Time.Hours {
	if (!timeStr)
		return 0

	const timeNum = timeStr.split(':').map(n => parseInt(n)) // TODO
	let hours
	if (timeNum.length == 3)
		hours = timeNum[0]! + timeNum[1]! / 60 + timeNum[1]! / 60 / 60
	else
		hours = 0
	if (!isFinite(hours))
		hours = 0
	return hours
}

export function getLogtimeReport(m: Mail): DB.LogtimeReport | null {
	// if (m.from != env.logtimeReportSender) // TODO add this?
	// 	return null
	try {
		const login = m.content.match(/(?<=Dear )\S+/)![0] as IntraLogin
		const d = (new Date(m.content.match(/(?<=For )\d{4}-\d{1,2}-\d{1,2}/)![0]!)).toISOString() // TODO: offset ??

		const buildingStr = m.content.match(/(?<=presence in building:? )\S+/im) || []
		const buildingTime = getHours(buildingStr[0])

		const clusterStr = m.content.match(/(?<=presence logged on cluster:? )\S+/im) || []
		const clusterTime = getHours(clusterStr[0])
		return {
			mail: {
				id: m.id,
				d: m.d.toISOString(),
			},
			from: m.from,
			d,
			login,
			buildingTime,
			clusterTime
		}
	} catch (err) {
		// console.log(err)
		return null
	}
}
