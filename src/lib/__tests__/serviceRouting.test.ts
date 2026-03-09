import { describe, expect, it } from "vitest";
import {
  isRuleTopicSetPath,
  isRuleTopicSimulationPath,
  resolveTopicServiceBase,
  resolveTopicSetServiceBase,
} from "../api/serviceRouting";
import { ADMIN_TOPICSETS_SERVICE_BASE, SEARCH_SERVICE_BASE } from "../api/serverServiceConfig";

describe("service routing", () => {
  it("routes topic simulation endpoints to rule service", () => {
    expect(isRuleTopicSimulationPath("simulate")).toBe(true);
    expect(isRuleTopicSimulationPath("simulate-impact")).toBe(true);
    expect(isRuleTopicSimulationPath("search")).toBe(false);
    expect(resolveTopicServiceBase("simulate")).toBe(ADMIN_TOPICSETS_SERVICE_BASE);
    expect(resolveTopicServiceBase("simulate-impact")).toBe(ADMIN_TOPICSETS_SERVICE_BASE);
  });

  it("routes topicset simulation endpoints to search service", () => {
    expect(isRuleTopicSetPath(["simulate-coverage"])).toBe(true);
    expect(isRuleTopicSetPath(["simulate-impact"])).toBe(true);
    expect(isRuleTopicSetPath(["simulate-overlap"])).toBe(true);
    expect(isRuleTopicSetPath(["simulate-overlap-docs"])).toBe(true);
    expect(isRuleTopicSetPath(["simulate-overlap-docs", "doc-1", "explain"])).toBe(true);
    expect(isRuleTopicSetPath(["simulate-unmapped"])).toBe(true);
    expect(isRuleTopicSetPath(["simulate-dashboard"])).toBe(true);
    expect(isRuleTopicSetPath(["123", "drift-history"])).toBe(false);
    expect(isRuleTopicSetPath(["123", "publish"])).toBe(false);
    expect(resolveTopicSetServiceBase(["simulate-coverage"])).toBe(SEARCH_SERVICE_BASE);
    expect(resolveTopicSetServiceBase(["simulate-impact"])).toBe(SEARCH_SERVICE_BASE);
    expect(resolveTopicSetServiceBase(["simulate-overlap-docs", "doc-1", "explain"])).toBe(
      SEARCH_SERVICE_BASE
    );
  });

  it("routes non-simulation topicset endpoints to admin service", () => {
    expect(resolveTopicSetServiceBase(["8a051855-6609-4596-ab77-067fdd829333"])).toBe(
      ADMIN_TOPICSETS_SERVICE_BASE
    );
    expect(resolveTopicSetServiceBase(["8a051855-6609-4596-ab77-067fdd829333", "versions"])).toBe(
      ADMIN_TOPICSETS_SERVICE_BASE
    );
    expect(
      resolveTopicSetServiceBase([
        "8a051855-6609-4596-ab77-067fdd829333",
        "nodes",
        "ccd6e9d8-aa9c-45c4-b9be-9d64d44f1b2b",
      ])
    ).toBe(ADMIN_TOPICSETS_SERVICE_BASE);
    expect(resolveTopicSetServiceBase(["8a051855-6609-4596-ab77-067fdd829333", "diff"])).toBe(
      ADMIN_TOPICSETS_SERVICE_BASE
    );
  });
});
