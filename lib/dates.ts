// Canonical storage format for all date-only fields is ISO "YYYY-MM-DD".
// Legacy rows may still hold "MM-DD-YY" or "MM-DD-YYYY", so reads stay tolerant
// while every new write goes out as ISO.

export const parseStoredDate = (value: string): Date => {
  if (!value) return new Date(NaN);

  const normalized = value.replace(/\//g, '-');
  const parts = normalized.split('-');

  if (parts.length === 3) {
    const [a, b, c] = parts;
    const n1 = parseInt(a, 10);
    const n2 = parseInt(b, 10);
    const n3 = parseInt(c, 10);

    if (!Number.isNaN(n1) && !Number.isNaN(n2) && !Number.isNaN(n3)) {
      if (a.length === 4) {
        return new Date(n1, n2 - 1, n3);
      }

      if (a.length <= 2) {
        const year = c.length === 2 ? n3 + 2000 : n3;
        return new Date(year, n1 - 1, n2);
      }
    }
  }

  return new Date(value);
};

export const toStoredDate = (date: Date): string => {
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Normalizes any legacy value to the ISO storage format.
export const normalizeStoredDate = (value: string): string => {
  if (!value) return '';
  const parsed = parseStoredDate(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return toStoredDate(parsed);
};

export const formatDisplayDate = (value?: string | null): string => {
  if (!value) return '';
  const parsed = parseStoredDate(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${month}/${day}/${parsed.getFullYear()}`;
};
