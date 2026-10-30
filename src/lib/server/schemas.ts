import * as v from 'valibot';

/** Validation shared by the admin, the projects and the import files. */

export const hex = v.pipe(v.string(), v.regex(/^#[0-9a-f]{6}$/i), v.toLowerCase());

export const name = v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(120));
