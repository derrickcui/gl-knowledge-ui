import { RuleNode } from "@/components/rule-builder/astTypes";
import { buildGroupExplainModel } from "@/components/rule-builder/explain/groupExplain";
import { generateRuleExplain } from "@/components/rule-builder/explain/ruleExplain";
import { createNodeId } from "@/components/rule-builder/nodeId";
import { AuditSnapshot, AuditGroupSnapshot } from "./auditTypes";

type MatchResult = {
  matchedGroupIds: string[];
  matchedConditionIds: string[];
  conditionEvidence?: Record<
    string,
    { docId: string; excerpt: string }[]
  >;
};

function stableId(id: string | undefined, fallback: string) {
  return id && id.length > 0 ? id : fallback;
}

export function buildAuditSnapshot({
  rule,
  ruleId,
  ruleVersion,
  actor,
  matchResult,
}: {
  rule: RuleNode;
  ruleId: string;
  ruleVersion: number;
  actor: string;
  matchResult: MatchResult;
}): AuditSnapshot {
  const groups: AuditGroupSnapshot[] =
    rule.children?.map((group, groupIndex) => {
      const groupId = stableId(group.id, `group-${groupIndex}`);
      const explainModel = buildGroupExplainModel(group);

      return {
        groupId,
        priority: group.priority ?? 100,
        explainHeader: explainModel.header,
        matched: matchResult.matchedGroupIds.includes(groupId),
        conditions:
          group.children?.map((condition, conditionIndex) => {
            const conditionId = stableId(
              condition.id,
              `${groupId}-condition-${conditionIndex}`
            );
            return {
              conditionId,
              explain:
                condition.explain?.text ??
                "\u6ee1\u8db3\u6307\u5b9a\u4e1a\u52a1\u6761\u4ef6",
              matched:
                matchResult.matchedConditionIds.includes(conditionId),
              evidence:
                matchResult.conditionEvidence?.[conditionId] ?? [],
            };
          }) ?? [],
      };
    }) ?? [];

  return {
    snapshotId: createNodeId(),
    ruleId,
    ruleVersion,
    createdAt: new Date().toISOString(),
    createdBy: actor,
    ruleExplain: generateRuleExplain(rule),
    groups,
  };
}
