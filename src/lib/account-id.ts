/** Preserve server-issued opaque text IDs; never coerce them to another citizen. */
export type AccountId = number | string;
export function isAccountId(value: unknown): value is AccountId {
  return typeof value === 'string' ? value.length > 0 && value.length <= 256 && value.trim() === value :
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
