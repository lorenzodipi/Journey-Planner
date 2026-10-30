/** Unisce le classi, saltando quelle false o vuote. */
export const cx = (...c: (string | false | null | undefined | 0)[]): string => c.filter(Boolean).join(' ')
