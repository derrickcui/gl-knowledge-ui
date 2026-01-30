let counter = 0;

export function createNodeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  counter = (counter + 1) % 100000;
  return `node-${Date.now()}-${counter}`;
}
