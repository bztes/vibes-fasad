import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { building } from '$app/env';
import { DATA_DIR } from '$app/env/private';

// `vite build` imports this to analyse the app: don't touch the real database then.
if (!building) mkdirSync(DATA_DIR, { recursive: true });
const client = createClient({
	url: building ? ':memory:' : `file:${path.join(DATA_DIR, 'app.db')}`
});
// Deletes rely on the schema's `onDelete` cascades, so they're enforced whatever the client's default.
await client.execute('PRAGMA foreign_keys = ON');

export const db = drizzle(client, { schema });

// Bring the schema up to date
if (!building) await migrate(db, { migrationsFolder: 'drizzle' });
