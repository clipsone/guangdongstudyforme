export function normalizeQuestionOptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((key) => {
        const item = record[key];
        return typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item ?? '').trim();
      })
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try { return normalizeQuestionOptions(JSON.parse(text)); } catch { return text.split(/\n|[|；;]/).map((x) => x.trim()).filter(Boolean); }
  }
  return [];
}
