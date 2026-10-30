import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' },
	DIR: {
		description:
			'Data directory; uploaded photos go in its `scenes` and `masks` folders, created as needed. Defaults to `./data`.',
		schema: (value: string | undefined) => value || './data'
	},
	EMAIL_PEPPER: {
		description:
			'Secret key for the hashes of recovery e-mail addresses, e.g. `openssl rand -base64 32`; without it, accounts have no recovery e-mail. Changing it breaks the addresses saved so far.',
		schema: optional
	},
	SMTP_URL: {
		description:
			'Server for recovery e-mails, e.g. `smtps://smtp.example.com`; without it, they are logged to the console.',
		schema: optional
	},
	SMTP_USER: {
		description: 'User name for the mail server, if it needs one.',
		schema: optional
	},
	SMTP_PASSWORD: {
		description: 'Password for the mail server.',
		schema: optional
	},
	SMTP_MAIL_FROM: {
		description: 'Sender of recovery e-mails, e.g. `Fasad <noreply@example.com>`.',
		schema: (value: string | undefined) => value || 'Fasad <noreply@localhost>'
	}
});
