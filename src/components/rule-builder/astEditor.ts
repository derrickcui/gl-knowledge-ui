import { RuleNode, cloneRule } from "./astTypes";

export function getNodeByPath(root: RuleNode, path: number[]): RuleNode {
  let cur = root;
  for (const idx of path) {
    if (!cur.children || !cur.children[idx]) {
      throw new Error("Invalid path");
    }
    cur = cur.children[idx];
  }
  return cur;
}

export function getParentByPath(
  root: RuleNode,
  path: number[]
): { parent: RuleNode; index: number } | null {
  if (path.length === 0) return null;
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  const parent = getNodeByPath(root, parentPath);
  return { parent, index };
}

export function addNode(
  root: RuleNode,
  path: number[],
  newNode: RuleNode
): RuleNode {
  const draft = cloneRule(root);
  const target = getNodeByPath(draft, path);

  if (Array.isArray(target.children)) {
    target.children.push(newNode);
    return normalizeAst(draft);
  }

  const parentInfo = getParentByPath(draft, path);
  if (!parentInfo) {
    return normalizeAst({
      type: "GROUP",
      params: { operator: "ALL" },
      children: [draft, newNode],
    });
  }

  const { parent, index } = parentInfo;
  parent.children![index] = {
    type: "GROUP",
    params: { operator: "ALL" },
    children: [target, newNode],
  };

  return normalizeAst(draft);
}

export function wrapNode(
  root: RuleNode,
  path: number[],
  wrapper: (child: RuleNode) => RuleNode
): RuleNode {
  const draft = cloneRule(root);
  const parentInfo = getParentByPath(draft, path);

  if (!parentInfo) {
    return normalizeAst(wrapper(draft));
  }

  const { parent, index } = parentInfo;
  const target = parent.children![index];
  parent.children![index] = wrapper(target);
  return normalizeAst(draft);
}

export function setRoot(
  root: RuleNode,
  path: number[],
  newRoot: RuleNode
): RuleNode {
  const draft = cloneRule(root);
  const target = getNodeByPath(draft, path);

  if (!target.children || target.children.length === 0) {
    return normalizeAst(draft);
  }

  newRoot.children = target.children ?? [];

  const parentInfo = getParentByPath(draft, path);
  if (!parentInfo) {
    return normalizeAst(newRoot);
  }

  const { parent, index } = parentInfo;
  parent.children![index] = newRoot;
  return normalizeAst(draft);
}

export function removeNode(root: RuleNode, path: number[]): RuleNode {
  if (path.length === 0) {
    return normalizeAst(root);
  }
  const draft = cloneRule(root);
  const parentInfo = getParentByPath(draft, path);
  if (!parentInfo || !parentInfo.parent.children) {
    return normalizeAst(draft);
  }
  const { parent, index } = parentInfo;
  parent.children.splice(index, 1);
  return normalizeAst(draft);
}

export function normalizeAst(root: RuleNode): RuleNode {
  if (!root.children || root.children.length === 0) {
    return root;
  }

  const nextChildren = root.children.map(normalizeAst);
  const next = { ...root, children: nextChildren };

  if (next.type === "GROUP" && next.params?.role === "RULE") {
    next.params = { ...next.params, operator: "ANY", sticky: true };
  }

  if (next.type === "GROUP" && next.params?.role === "SCENARIO") {
    next.params = { ...next.params, operator: "ALL", sticky: true };
  }

  const sticky = next.type === "GROUP" && !!next.params?.sticky;
  if (!sticky && next.type === "GROUP" && next.children.length === 1) {
    return next.children[0];
  }

  return next;
}
