const UNICODE_ESCAPE_REGEX =
  /\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g;

export function decodeUnicodeEscapes(value: string) {
  if (!value.includes("\\u")) return value;
  return value.replace(
    UNICODE_ESCAPE_REGEX,
    (match, codePoint, codeUnit) => {
      const hex = (codePoint ?? codeUnit) as string | undefined;
      if (!hex) return match;
      const num = Number.parseInt(hex, 16);
      if (Number.isNaN(num)) return match;
      try {
        return String.fromCodePoint(num);
      } catch {
        return match;
      }
    }
  );
}
