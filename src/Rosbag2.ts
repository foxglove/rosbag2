import type { RosMsgDefinition } from "@foxglove/rosmsg";
import { ros2galactic } from "@foxglove/rosmsg-msgs-common";
import { MessageReader } from "@foxglove/rosmsg2-serialization";
import { Time, isLessThan as isTimeLessThan } from "@foxglove/rostime";
import { foxgloveMessageSchemas, generateRosMsgDefinition } from "@foxglove/schemas";

import { MessageIterator } from "./MessageIterator";
import { Message, MessageReadOptions, RawMessage, SqliteDb, TopicDefinition } from "./types";

export const ROS2_TO_DEFINITIONS = new Map<string, RosMsgDefinition>();
export const ROS2_DEFINITIONS_ARRAY: RosMsgDefinition[] = [];

// Add ROS2 common message definitions (rcl_interfaces, common_interfaces, etc)
for (const [dataType, msgdef] of Object.entries(ros2galactic)) {
  ROS2_DEFINITIONS_ARRAY.push(msgdef);

  // Handle the datatype naming difference used in rosbag2 (but not the .msg files)
  ROS2_TO_DEFINITIONS.set(dataTypeToFullName(dataType), msgdef);
}

// Add foxglove message definitions
for (const schema of Object.values(foxgloveMessageSchemas)) {
  const { rosMsgInterfaceName, rosFullInterfaceName, fields } = generateRosMsgDefinition(schema, {
    rosVersion: 2,
  });
  const msgdef: RosMsgDefinition = { name: rosMsgInterfaceName, definitions: fields };
  if (!ROS2_TO_DEFINITIONS.has(rosFullInterfaceName)) {
    ROS2_DEFINITIONS_ARRAY.push(msgdef);
    ROS2_TO_DEFINITIONS.set(rosFullInterfaceName, msgdef);
  }
}

// Add the legacy foxglove_msgs/ImageMarkerArray message definition
const imageMarkerArray: RosMsgDefinition = {
  name: "foxglove_msgs/ImageMarkerArray",
  definitions: [
    { type: "visualization_msgs/ImageMarker", isArray: true, name: "markers", isComplex: true },
  ],
};
ROS2_DEFINITIONS_ARRAY.push(imageMarkerArray);
ROS2_TO_DEFINITIONS.set("foxglove_msgs/msg/ImageMarkerArray", imageMarkerArray);

export class Rosbag2 {
  private messageReaders_ = new Map<string, MessageReader>();
  private databases_: SqliteDb[];

  constructor(files: SqliteDb[]) {
    this.databases_ = files;
  }

  async open(): Promise<void> {
    for (const db of this.databases_) {
      await db.open();
    }
  }

  async close(): Promise<void> {
    if (this.databases_ != undefined) {
      for (const db of this.databases_) {
        await db.close();
      }
    }
    this.databases_ = [];
  }

  async readTopics(): Promise<TopicDefinition[]> {
    if (this.databases_ == undefined) {
      throw new Error("Cannot read topics before opening rosbag");
    }

    if (this.databases_.length === 0) {
      return [];
    }

    const firstDb = this.databases_[0]!;
    return await firstDb.readTopics();
  }

  readMessages(opts: MessageReadOptions = {}): AsyncIterableIterator<Message> {
    if (this.databases_ == undefined) {
      throw new Error("Cannot read messages before opening rosbag");
    }

    if (this.databases_.length === 0) {
      return new MessageIterator([]);
    }

    const rowIterators = this.databases_.map((db) => db.readMessages(opts));
    return new MessageIterator(
      rowIterators,
      opts.rawMessages !== true ? this.decodeMessage : undefined,
    );
  }

  async timeRange(): Promise<[min: Time, max: Time]> {
    if (this.databases_ == undefined) {
      throw new Error("Cannot read time range before opening rosbag");
    }

    if (this.databases_.length === 0) {
      return [
        { sec: 0, nsec: 0 },
        { sec: 0, nsec: 0 },
      ];
    }

    let min = { sec: Number.MAX_SAFE_INTEGER, nsec: 0 };
    let max = { sec: Number.MIN_SAFE_INTEGER, nsec: 0 };
    for (const db of this.databases_) {
      const [curMin, curMax] = await db.timeRange();
      min = minTime(min, curMin);
      max = maxTime(max, curMax);
    }
    return [min, max];
  }

  async messageCounts(): Promise<Map<string, number>> {
    if (this.databases_ == undefined) {
      throw new Error("Cannot read message counts before opening rosbag");
    }

    const allCounts = new Map<string, number>();
    if (this.databases_.length === 0) {
      return allCounts;
    }

    for (const db of this.databases_) {
      const counts = await db.messageCounts();
      for (const [topic, count] of counts) {
        allCounts.set(topic, (allCounts.get(topic) ?? 0) + count);
      }
    }
    return allCounts;
  }

  private decodeMessage = (rawMessage: RawMessage): unknown => {
    // Find or create a message reader for this message
    let reader = this.messageReaders_.get(rawMessage.topic.type);
    if (reader == undefined) {
      const msgdef = ROS2_TO_DEFINITIONS.get(rawMessage.topic.type);
      if (msgdef == undefined) {
        throw new Error(`Unknown message type: ${rawMessage.topic.type}`);
      }
      reader = new MessageReader([msgdef, ...ROS2_DEFINITIONS_ARRAY]);
      this.messageReaders_.set(rawMessage.topic.type, reader);
    }

    return reader.readMessage(rawMessage.data);
  };
}

function minTime(a: Time, b: Time): Time {
  return isTimeLessThan(a, b) ? a : b;
}

function maxTime(a: Time, b: Time): Time {
  return isTimeLessThan(a, b) ? b : a;
}

function dataTypeToFullName(dataType: string): string {
  const parts = dataType.split("/");
  if (parts.length === 2) {
    return `${parts[0]!}/msg/${parts[1]!}`;
  }
  return dataType;
}
