import type { RosMsgDefinition } from "@foxglove/rosmsg";
import { definitions as commonDefs } from "@foxglove/rosmsg-msgs-common";
import { definitions as foxgloveDefs } from "@foxglove/rosmsg-msgs-foxglove";
import { MessageReader } from "@foxglove/rosmsg2-serialization";
import { Time, isLessThan as isTimeLessThan } from "@foxglove/rostime";

import { MessageIterator } from "./MessageIterator";
import { Message, MessageReadOptions, RawMessage, SqliteDb, TopicDefinition } from "./types";

export const ROS2_TO_DEFINITIONS = new Map<string, RosMsgDefinition>();
export const ROS2_DEFINITIONS_ARRAY: RosMsgDefinition[] = [];

// New ROS2 header message definition
commonDefs["std_msgs/Header"] = {
  name: "std_msgs/Header",
  definitions: [
    { type: "time", isArray: false, name: "stamp", isComplex: false },
    { type: "string", isArray: false, name: "frame_id", isComplex: false },
  ],
};

// Handle the datatype naming difference used in rosbag2 (but not the .msg files)
for (const ros1Datatype in commonDefs) {
  const ros2Datatype = ros1Datatype.replace("_msgs/", "_msgs/msg/");
  const msgdef = (commonDefs as Record<string, RosMsgDefinition>)[ros1Datatype]!;
  ROS2_DEFINITIONS_ARRAY.push(msgdef);
  ROS2_TO_DEFINITIONS.set(ros2Datatype, msgdef);
}
for (const ros1Datatype in foxgloveDefs) {
  const ros2Datatype = ros1Datatype.replace("_msgs/", "_msgs/msg/");
  if (!ROS2_TO_DEFINITIONS.has(ros2Datatype)) {
    const msgdef = (foxgloveDefs as Record<string, RosMsgDefinition>)[ros1Datatype]!;
    ROS2_DEFINITIONS_ARRAY.push(msgdef);
    ROS2_TO_DEFINITIONS.set(ros2Datatype, msgdef);
  }
}

// New ROS2 log message definition
ROS2_TO_DEFINITIONS.set("rcl_interfaces/msg/Log", {
  name: "rcl_interfaces/msg/Log",
  definitions: [
    { type: "int8", name: "DEBUG", isConstant: true, value: 1 },
    { type: "int8", name: "INFO", isConstant: true, value: 2 },
    { type: "int8", name: "WARN", isConstant: true, value: 4 },
    { type: "int8", name: "ERROR", isConstant: true, value: 8 },
    { type: "int8", name: "FATAL", isConstant: true, value: 16 },
    { type: "time", isArray: false, name: "stamp", isComplex: false },
    { type: "uint8", isArray: false, name: "level", isComplex: false },
    { type: "string", isArray: false, name: "name", isComplex: false },
    { type: "string", isArray: false, name: "msg", isComplex: false },
    { type: "string", isArray: false, name: "file", isComplex: false },
    { type: "string", isArray: false, name: "function", isComplex: false },
    { type: "uint32", isArray: false, name: "line", isComplex: false },
  ],
});

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
