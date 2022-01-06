import { Mail } from '../types'
import { ForwardVerification } from '../models'

export function getForwardVerification(m: Mail): ForwardVerification | null {
	try {
		const verification = {
			code: m.subject.match(/(?<=\(#)\d+/i)![0]!,
			from: m.subject.match(/\S+$/i)![0]!,
			mailID: m.id,
			d: m.d,
		}
		return verification
	} catch (err) {
		return null
	}
}
