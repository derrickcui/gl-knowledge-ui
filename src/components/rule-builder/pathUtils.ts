import { RuleNode } from "./astTypes";

export type ActivePath = number[];

export function isValidPath(root: RuleNode, path: number[]): boolean {
  try {
    let cur = root;
    for (const idx of path) {
      if (!cur.children || !cur.children[idx]) return false;
      cur = cur.children[idx];
    }
    return true;
  } catch {
    return false;
  }
}

export function isSamePath(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export function isAncestorPath(a: number[], b: number[]): boolean {
  if (a.length > b.length) return false;
  return a.every((v, i) => b[i] === v);
}
