import { defineConfig } from 'drizzle-kit';

const dataDir = process.env.DATA_DIR ?? './data';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: `file:${dataDir}/app.db` },
	verbose: true,
	strict: true
});
