import { Duration, Time, areEqual as areTimesEqual, fromNanoSec } from "@foxglove/rostime";

import {
  Metadata,
  QosPolicyDurability,
  QosPolicyHistory,
  QosPolicyLiveliness,
  QosPolicyReliability,
  QosProfile,
  TopicDefinition,
} from "./types";
import { parseYaml } from "./yaml";

type Obj = Record<string, unknown>;
type TopicAndCount = { topic: TopicDefinition; messageCount: number };

const TIME_ZERO: Time = { sec: 0, nsec: 0 };
const DURATION_INFINITY: Duration = { sec: 2147483647, nsec: 4294967295 };

/**
 * Parses rosbag2 metadata.yaml file contents into a Metadata object.
 * @param data A YAML string from a metadata.yaml file
 * @returns Parsed rosbag2 metadata on success, otherwise undefined
 */
export function parseMetadata(data: string): Metadata | undefined {
  const parsed = parseYaml(data) as Obj | undefined;
  if (parsed == undefined) {
    return undefined;
  }

  const info = getObject(parsed, "rosbag2_bagfile_information");
  if (info == undefined) {
    return undefined;
  }

  // Parse the topic metadata
  const topicsWithMessageCount: TopicAndCount[] = [];
  const topicsData = getArray(info, "topics_with_message_count");
  if (topicsData != undefined) {
    for (const entry of topicsData) {
      if (entry != undefined) {
        const topicAndCount = getTopicAndCount(entry as Obj);
        if (topicAndCount != undefined) {
          topicsWithMessageCount.push(topicAndCount);
        }
      }
    }
  }

  // Parse the list of file paths
  const relativeFilePaths = (getArray(info, "relative_file_paths") ?? []).filter(
    (filePath) => typeof filePath === "string",
  ) as string[];

  return {
    version: getNumber(info, "version"),
    storageIdentifier: getString(info, "storage_identifier"),
    relativeFilePaths,
    duration: getVerboseDuration(info, "duration"),
    startingTime: getTime(info, "starting_time"),
    messageCount: getNumber(info, "message_count"),
    topicsWithMessageCount,
    compressionFormat: getString(info, "compression_format"),
    compressionMode: getString(info, "compression_mode"),
  };
}

/**
 * Parses a YAML string into a list of ROS2 QoS profiles. Missing values will be filled in with
 * rosbag2 QoS defaults.
 *
 * These are the default values for QoS profile fields, according to
 * <https://github.com/ros2/rosbag2/blob/master/README.md#overriding-qos-profiles>
 *
 *   history: keep_last
 *   depth: 10
 *   reliability: reliable
 *   durability: volatile
 *   deadline:
 *     # unspecified/infinity
 *     sec: 0
 *     nsec: 0
 *   lifespan:
 *     # unspecified/infinity
 *     sec: 0
 *     nsec: 0
 *   liveliness: system_default
 *   liveliness_lease_duration:
 *     # unspecified/infinity
 *     sec: 0
 *     nsec: 0
 * avoid_ros_namespace_conventions: false
 * @param data A string in YAML format
 * @returns A list of parsed QoS profiles
 */
export function parseQosProfiles(data: string): QosProfile[] {
  const parsed = parseYaml(data);
  return Array.isArray(parsed) ? getQosProfiles(parsed) : [];
}

function getTopicAndCount(obj: Obj): TopicAndCount | undefined {
  const topicData = getObject(obj, "topic_metadata");
  if (topicData == undefined) {
    return undefined;
  }
  const topic = getTopic(topicData);
  if (topic == undefined) {
    return undefined;
  }

  const messageCount = getNumber(obj, "message_count") ?? 0;
  return { topic, messageCount };
}

function getTopic(obj: Obj): TopicDefinition | undefined {
  const name = getString(obj, "name");
  const type = getString(obj, "type");
  if (name == undefined || type == undefined) {
    return undefined;
  }

  const qosProfilesStr = getString(obj, "offered_qos_profiles") ?? "";

  return {
    name,
    type,
    serializationFormat: getString(obj, "serialization_format") ?? "",
    offeredQosProfiles: parseQosProfiles(qosProfilesStr),
  };
}

function getQosProfiles(array: Obj[]): QosProfile[] {
  const profiles: QosProfile[] = [];
  for (const entryMaybe of array) {
    if (entryMaybe == undefined) {
      continue;
    }
    profiles.push(getQosProfile(entryMaybe));
  }
  return profiles;
}

function getQosProfile(obj: Obj): QosProfile {
  const history = getNumber(obj, "history") ?? -1;
  const reliability = getNumber(obj, "reliability") ?? -1;
  const durability = getNumber(obj, "durability") ?? -1;
  const liveliness = getNumber(obj, "liveliness") ?? -1;

  return {
    history: history in QosPolicyHistory ? history : QosPolicyHistory.KeepLast,
    depth: getNumber(obj, "depth") ?? 10,
    reliability: reliability in QosPolicyReliability ? reliability : QosPolicyReliability.Reliable,
    durability: durability in QosPolicyDurability ? durability : QosPolicyDurability.Volatile,
    deadline: getDuration(obj, "deadline"),
    lifespan: getDuration(obj, "lifespan"),
    liveliness: liveliness in QosPolicyLiveliness ? liveliness : QosPolicyLiveliness.SystemDefault,
    livelinessLeaseDuration: getDuration(obj, "liveliness_lease_duration"),
    avoidRosNamespaceConventions: getBoolean(obj, "avoid_ros_namespace_conventions") ?? false,
  };
}

function getObject(obj: Obj, field: string): Obj | undefined {
  const value = obj[field];
  return typeof value === "object" ? (value as Obj) : undefined;
}

function getArray(obj: Obj, field: string): unknown[] | undefined {
  const value = obj[field];
  return Array.isArray(value) ? value : undefined;
}

function getNumber(obj: Obj, field: string): number | undefined {
  const value = obj[field];
  return typeof value === "bigint" ? Number(value) : typeof value === "number" ? value : undefined;
}

function getBoolean(obj: Obj, field: string): boolean | undefined {
  const value = obj[field];
  return typeof value === "boolean"
    ? value
    : typeof value === "bigint" || typeof value === "number"
    ? Boolean(value)
    : undefined;
}

function getString(obj: Obj, field: string): string | undefined {
  const value = obj[field];
  return typeof value === "string" ? value : undefined;
}

function getDuration(obj: Obj, field: string): Duration | undefined {
  const value = obj[field] as Obj | undefined;
  if (value == undefined) {
    return undefined;
  }
  // This handles both bigint and number types
  const duration = { sec: Number(value["sec"]), nsec: Number(value["nsec"]) };
  if (
    isNaN(duration.sec) ||
    isNaN(duration.nsec) ||
    areTimesEqual(duration, TIME_ZERO) ||
    areTimesEqual(duration, DURATION_INFINITY)
  ) {
    return undefined;
  }
  return duration;
}

function getTime(obj: Obj, field: string): Time | undefined {
  const value = obj[field] as Obj | undefined;
  if (value == undefined) {
    return undefined;
  }

  const nsec = value["nanoseconds_since_epoch"];
  if (typeof nsec !== "bigint") {
    return undefined;
  }

  return fromNanoSec(nsec);
}

function getVerboseDuration(obj: Obj, field: string): Duration | undefined {
  const value = obj[field] as Obj | undefined;
  if (value == undefined) {
    return undefined;
  }

  const nsec = value["nanoseconds"];
  if (typeof nsec !== "bigint") {
    return undefined;
  }

  return fromNanoSec(nsec);
}
