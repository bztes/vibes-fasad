import * as v from 'valibot';
import type { db } from '#lib/server/db/index.ts';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Why an import failed, shown by `ImportExport`; `detail` points at the bad entry. */
export type ImportResult =
	{ imported: number } | { importError: 'missing' | 'zip' | 'json' | 'invalid'; detail?: string };

/** A file that parses but can't be written, e.g. naming a missing image. */
export class ImportError extends Error {}

/** The JSON in `text` read with `schema`, or why it can't be; issues are located from `file`. */
export function parseImport<Schema extends v.GenericSchema>(
	schema: Schema,
	text: string,
	file: string
): { output: v.InferOutput<Schema> } | ImportResult {
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		return { importError: 'json' };
	}
	const parsed = v.safeParse(schema, json);
	if (parsed.success) return { output: parsed.output };
	const issue = parsed.issues[0];
	return { importError: 'invalid', detail: `${v.getDotPath(issue) ?? file}: ${issue.message}` };
}

/** The number of entries `write` imported, or the `ImportError` it threw. */
export async function runImport(write: () => Promise<number>): Promise<ImportResult> {
	try {
		return { imported: await write() };
	} catch (error) {
		if (!(error instanceof ImportError)) throw error;
		return { importError: 'invalid', detail: error.message };
	}
}
