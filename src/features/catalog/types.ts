/** Field-level validation errors keyed by form field name. */
export type FieldErrors = Record<string, string[] | undefined>;

/** Result returned by every catalog Server Action (used with useActionState). */
export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: FieldErrors;
  /** Id of the created record, when relevant (used for redirects). */
  id?: string;
} | null;
