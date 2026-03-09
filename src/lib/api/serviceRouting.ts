import {
  ADMIN_TOPICSETS_SERVICE_BASE,
  SEARCH_SERVICE_BASE,
} from "@/lib/api/serverServiceConfig";

const TOPIC_SIMULATION_PATHS = new Set(["simulate", "simulate-impact"]);

const TOPICSET_SIMULATION_PATHS = new Set([
  "simulate-coverage",
  "simulate-impact",
  "simulate-overlap",
  "simulate-overlap-docs",
  "simulate-unmapped",
  "simulate-dashboard",
]);

export function isRuleTopicSimulationPath(path: string) {
  return TOPIC_SIMULATION_PATHS.has(path);
}

export function resolveTopicServiceBase(path: string) {
  return ADMIN_TOPICSETS_SERVICE_BASE;
}

export function isRuleTopicSetPath(pathSegments: string[]) {
  if (pathSegments.length === 0) return false;
  if (TOPICSET_SIMULATION_PATHS.has(pathSegments[0])) return true;
  if (pathSegments[0] === "simulate-overlap-docs" && pathSegments[pathSegments.length - 1] === "explain") {
    return true;
  }
  return false;
}

export function resolveTopicSetServiceBase(pathSegments: string[]) {
  return isRuleTopicSetPath(pathSegments) ? SEARCH_SERVICE_BASE : ADMIN_TOPICSETS_SERVICE_BASE;
}
