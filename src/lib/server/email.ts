import { createHmac } from 'node:crypto';
import { EMAIL_PEPPER, SMTP_MAIL_FROM, SMTP_PASSWORD, SMTP_URL, SMTP_USER } from '$app/env/private';
import { createTransport, type Transporter } from 'nodemailer';

// Recovery e-mails are kept only as a keyed hash: an address typed in again finds its account,
// but the database alone gives none away. The key, `EMAIL_PEPPER`, isn't in the database, so a
// copy of it can't be matched against guessed addresses either. Without the key, accounts have
// no recovery e-mail.

export const emailEnabled = Boolean(EMAIL_PEPPER);

/** Lowercased and trimmed, so the address matches however it's typed. */
const normalize = (email: string) => email.trim().toLowerCase();

export function hashEmail(email: string) {
	if (!EMAIL_PEPPER) throw new Error('EMAIL_PEPPER is not set');
	return createHmac('sha256', EMAIL_PEPPER).update(normalize(email)).digest('hex');
}

/** E.g. "n•••@gmail.com" for nico@gmail.com. */
export function maskEmail(email: string) {
	const [local, domain] = normalize(email).split(/@(?=[^@]*$)/);
	return `${local.slice(0, 1)}•••@${domain}`;
}

let transport: Transporter | undefined;

/** Sends a plain text e-mail; without `SMTP_URL`, logs it instead, e.g. in development. */
export async function sendMail(to: string, subject: string, text: string) {
	if (!SMTP_URL) {
		console.info(`E-mail to ${to}: ${subject}\n\n${text}\n`);
		return;
	}
	transport ??= createTransport({
		url: SMTP_URL,
		auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined
	});
	await transport.sendMail({ from: SMTP_MAIL_FROM, to, subject, text });
}

const HOUR = 60 * 60 * 1000;

const sent = new Map<string, number[]>();

/**
 * Whether another e-mail may go out for `key`, e.g. an address hash or IP, at most `limit` an
 * hour; counts it if so. Kept in memory: a restart forgets.
 */
export function allowMail(key: string, limit: number) {
	const now = Date.now();
	if (sent.size > 10_000) {
		for (const [other, times] of sent) if (now - times.at(-1)! >= HOUR) sent.delete(other);
	}
	const recent = (sent.get(key) ?? []).filter((time) => now - time < HOUR);
	if (recent.length >= limit) return false;
	sent.set(key, [...recent, now]);
	return true;
}
