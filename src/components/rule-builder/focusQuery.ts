export function parseFocusPath(raw: string | null): number[] | null {
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((num) => Number.isNaN(num) || num < 0)) return null;
  return nums;
}
