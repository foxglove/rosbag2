import { Time, isTime } from "@foxglove/rostime";
import { load as parseYaml } from "js-yaml";

import type { QosProfile } from "./types";

export function parseQosProfiles(data: string): QosProfile[] {
  const profiles: QosProfile[] = [];

  const parsed = parseYaml(data) as unknown;
  if (Array.isArray(parsed)) {
    for (const entryMaybe of parsed) {
      if (entryMaybe == undefined) {
        continue;
      }
      const entry = entryMaybe as Record<string, unknown>;

      profiles.push({
        history: getNumber(entry, "history") ?? 0,
        depth: getNumber(entry, "depth") ?? 0,
        reliability: getBoolean(entry, "reliability") ?? false,
        durability: getBoolean(entry, "durability") ?? false,
        deadline: getTime(entry, "deadline"),
        lifespan: getTime(entry, "lifespan"),
        liveliness: getBoolean(entry, "liveliness") ?? false,
        livelinessLeaseDuration: getTime(entry, "liveliness_lease_duration"),
        avoidRosNamespaceConventions: getBoolean(entry, "avoid_ros_namespace_conventions") ?? false,
      });
    }
  }

  return profiles;
}

function getNumber(obj: Record<string, unknown>, field: string): number | undefined {
  const value = obj[field];
  return typeof value === "number" ? value : undefined;
}

function getBoolean(obj: Record<string, unknown>, field: string): boolean | undefined {
  const value = obj[field];
  return typeof value === "boolean"
    ? value
    : typeof value === "number"
    ? Boolean(value)
    : undefined;
}

function getTime(obj: Record<string, unknown>, field: string): Time | undefined {
  const value = obj[field];
  return isTime(value) ? value : undefined;
}
