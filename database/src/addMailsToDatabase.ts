import { IntraLogin } from "./database"
import { Mail } from "./getMails"

type Hours = number
export interface LogtimeReport {
	login: IntraLogin,
	epoch: number,
	buildingTime: Hours,
	clusterTime: Hours,
}

// const year = parseInt(m.content.match(/(?<=For )\d+/)![0]!)
// const month = parseInt(m.content.match(/(?<=(For \d\d\d\d)-)\d\d/)![0]!)
// const day = parseInt(m.content.match(/(?<=(For \d\d\d\d)-\d\d-)\d\d/)![0]!)
// if (!isFinite(year) || !isFinite(month) || !isFinite(day))
// 	return null

export function getLogtimeReport(m: Mail): LogtimeReport | null {
	try {
		const login = m.content.match(/(?<=Dear )\w+/)![0] as IntraLogin
		const epoch = (new Date(m.content.match(/(?<=For )\d{4}-\d{1,2}-\d{1,2}/)![0]!)).getTime() // TODO: offset ??

		const [hours, minutes, seconds] = m.content.match(/(?<=presence in building )\d{1,2}:\d{1,2}:\d{1,2}/)![0]!.split(':').map(n => parseInt(n))
		const buildingTime = hours! + minutes! / 60 + seconds! / 60 / 60
		const [hours1, minutes1, seconds1] = m.content.match(/(?<=presence logged on cluster )\d{1,2}:\d{1,2}:\d{1,2}/)![0]!.split(':').map(n => parseInt(n))
		const clusterTime = hours1! + minutes1! / 60 + seconds1! / 60 / 60
		if (!isFinite(buildingTime) || !isFinite(clusterTime))
			return null

		return { login, epoch, buildingTime, clusterTime }
	} catch (err) {
		// console.log(err)
		return null
	}
}
