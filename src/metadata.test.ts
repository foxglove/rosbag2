import { readFile } from "fs/promises";
import path from "path";

import { parseMetadata, parseQosProfiles } from "./metadata";
import {
  QosPolicyDurability,
  QosPolicyHistory,
  QosPolicyLiveliness,
  QosPolicyReliability,
} from "./types";

describe("parseQosProfiles", () => {
  it("parses a single QOS profile", () => {
    const profiles = parseQosProfiles(
      `- history: 3\n  depth: 0\n  reliability: 1\n  durability: 2\n  deadline:\n    sec: 0\n    nsec: 0\n  lifespan:\n    sec: 10\n    nsec: 0\n  liveliness: 1\n  liveliness_lease_duration:\n    sec: 0\n    nsec: 0\n  avoid_ros_namespace_conventions: false`,
    );
    expect(profiles).toHaveLength(1);
    const profile = profiles[0]!;
    expect(profile.history).toEqual(3);
    expect(profile.depth).toEqual(0);
    expect(profile.reliability).toEqual(1);
    expect(profile.durability).toEqual(2);
    expect(profile.deadline).toBeUndefined();
    expect(profile.lifespan).toEqual({ sec: 10, nsec: 0 });
    expect(profile.liveliness).toEqual(1);
    expect(profile.livelinessLeaseDuration).toBeUndefined();
    expect(profile.avoidRosNamespaceConventions).toEqual(false);
  });
});

describe("parseMetadata", () => {
  it("parses example metadata", async () => {
    const metadataYamlStr = await readFile(
      path.join(__dirname, "..", "tests", "bags", "talker", "metadata.yaml"),
      { encoding: "utf8" },
    );

    const metadata = parseMetadata(metadataYamlStr)!;
    expect(metadata).toBeDefined();
    expect(metadata.version).toEqual(4);
    expect(metadata.storageIdentifier).toEqual("sqlite3");
    expect(metadata.relativeFilePaths).toHaveLength(1);
    expect(metadata.relativeFilePaths[0]).toEqual("talker.db3");
    expect(metadata.duration).toEqual({ sec: 4, nsec: 531096768 });
    expect(metadata.startingTime).toEqual({ sec: 1585866235, nsec: 112411371 });
    expect(metadata.messageCount).toEqual(20);
    expect(metadata.topicsWithMessageCount).toHaveLength(3);
    expect(metadata.compressionFormat).toEqual("");
    expect(metadata.compressionMode).toEqual("");

    const topic0 = metadata.topicsWithMessageCount[0]!;
    const topic1 = metadata.topicsWithMessageCount[1]!;
    const topic2 = metadata.topicsWithMessageCount[2]!;

    expect(topic0.topic.name).toEqual("/topic");
    expect(topic0.topic.type).toEqual("std_msgs/msg/String");
    expect(topic0.topic.serializationFormat).toEqual("cdr");
    expect(topic0.topic.offeredQosProfiles).toHaveLength(1);
    expect(topic0.messageCount).toEqual(10);

    expect(topic1.topic.name).toEqual("/rosout");
    expect(topic1.topic.type).toEqual("rcl_interfaces/msg/Log");
    expect(topic1.topic.serializationFormat).toEqual("cdr");
    expect(topic1.topic.offeredQosProfiles).toHaveLength(1);
    expect(topic1.messageCount).toEqual(10);

    expect(topic2.topic.name).toEqual("/parameter_events");
    expect(topic2.topic.type).toEqual("rcl_interfaces/msg/ParameterEvent");
    expect(topic2.topic.serializationFormat).toEqual("cdr");
    expect(topic2.topic.offeredQosProfiles).toHaveLength(1);
    expect(topic2.messageCount).toEqual(0);

    const qosProfile0 = topic0.topic.offeredQosProfiles[0]!;
    expect(qosProfile0.avoidRosNamespaceConventions).toEqual(false);
    expect(qosProfile0.deadline).toBeUndefined();
    expect(qosProfile0.depth).toEqual(0);
    expect(qosProfile0.durability).toEqual(QosPolicyDurability.Volatile);
    expect(qosProfile0.history).toEqual(QosPolicyHistory.Unknown);
    expect(qosProfile0.lifespan).toBeUndefined();
    expect(qosProfile0.liveliness).toEqual(QosPolicyLiveliness.Automatic);
    expect(qosProfile0.livelinessLeaseDuration).toBeUndefined();
    expect(qosProfile0.reliability).toEqual(QosPolicyReliability.Reliable);
  });
});
