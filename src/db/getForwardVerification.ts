import { DB, Mail } from '../types'

export function getForwardVerification(m: Mail): DB.ForwardVerification | null {
	try {
		const verification = {
			code: m.content.match(/(?<=Confirmation code: )\S+/gi)![0]!,
			from: m.content.match(/\S+(?= has requested to automatically forward mail)/gi)![0]!,
			mailID: m.id,
		}
		return verification
	} catch (err) {
		return null
	}
}
