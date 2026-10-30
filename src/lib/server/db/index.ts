import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { building } from '$app/env';
import { DATABASE_URL } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = createClient({ url: DATABASE_URL });
// Deletes rely on the schema's `onDelete` cascades, so they're enforced whatever the client's default.
await client.execute('PRAGMA foreign_keys = ON');

export const db = drizzle(client, { schema });

// Bring the schema up to date
if (!building) await migrate(db, { migrationsFolder: 'drizzle' });
