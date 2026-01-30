import { describe, it, expect } from "vitest";
import { ruleNodeToBusinessRule, businessRuleToRuleNode } from "@/lib/business-rule";
import { RuleNode } from "@/components/rule-builder/astTypes";

describe("topic useOriginalRule", () => {
  it("sets useOriginalRule when TOPIC_REF is not wrapped", () => {
    const rule: RuleNode = {
      type: "GROUP",
      params: { role: "RULE", operator: "ANY" },
      children: [
        {
          type: "GROUP",
          params: { role: "SCENARIO", operator: "AND" },
          children: [
            {
              type: "TOPIC_REF",
              params: { topicId: "topic-1", topicName: "Topic A" },
            },
          ],
        },
      ],
    };

    const business = ruleNodeToBusinessRule(rule);
    const condition = business.groups[0].conditions[0];
    expect(condition.kind).toBe("TOPIC_REF");
    expect(condition.payload.useOriginalRule).toBe(true);
  });

  it("skips location wrapping when useOriginalRule is true", () => {
    const rule = {
      logic: "ANY",
      groups: [
        {
          id: "group-1",
          priority: 100,
          operator: "AND",
          conditions: [
            {
              id: "cond-1",
              kind: "TOPIC_REF",
              payload: {
                topicId: "topic-1",
                topicName: "Topic A",
                location: {
                  inBody: true,
                  inTitle: false,
                  inParagraph: false,
                  inSentence: false,
                },
                useOriginalRule: true,
              },
            },
          ],
        },
      ],
    } as any;

    const node = businessRuleToRuleNode(rule);
    const child = node.children?.[0]?.children?.[0];
    expect(child?.type).toBe("TOPIC_REF");
    expect(child?.params?.useOriginalRule).toBe(true);
  });
});
