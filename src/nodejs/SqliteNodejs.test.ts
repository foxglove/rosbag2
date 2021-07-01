import { Time, add as addTimes, isTimeInRangeInclusive } from "@foxglove/rostime";
import path from "path";

import { SqliteNodejs } from "./SqliteNodejs";

const TALKER_DB = path.join(__dirname, "..", "..", "tests", "bags", "talker", "talker.db3");
const BAG_START: Time = { sec: 1585866235, nsec: 112411371 };
const BAG_END: Time = { sec: 1585866239, nsec: 643508139 };

describe("SqliteNodejs", () => {
  it("should open a database", async () => {
    const db = new SqliteNodejs(TALKER_DB);
    expect(db.filename).toEqual(TALKER_DB);
    await db.open();
  });

  it("should read all topics", async () => {
    const db = new SqliteNodejs(TALKER_DB);
    await db.open();

    const topics = await db.readTopics();
    expect(topics).toHaveLength(3);

    expect(topics[0]?.name).toEqual("/rosout");
    expect(topics[0]?.type).toEqual("rcl_interfaces/msg/Log");
    expect(topics[0]?.serializationFormat).toEqual("cdr");
    expect(topics[0]?.offeredQosProfiles).toHaveLength(1);
    const qosProfile0 = topics[0]!.offeredQosProfiles[0]!;
    expect(qosProfile0.avoidRosNamespaceConventions).toEqual(false);
    expect(qosProfile0.deadline).toEqual({ sec: 2147483647, nsec: 4294967295 });
    expect(qosProfile0.depth).toEqual(0);
    expect(qosProfile0.durability).toEqual(true);
    expect(qosProfile0.history).toEqual(3);
    expect(qosProfile0.lifespan).toEqual({ sec: 10, nsec: 0 });
    expect(qosProfile0.liveliness).toEqual(true);
    expect(qosProfile0.livelinessLeaseDuration).toEqual({ sec: 2147483647, nsec: 4294967295 });
    expect(qosProfile0.reliability).toEqual(true);

    expect(topics[1]?.name).toEqual("/parameter_events");
    expect(topics[1]?.type).toEqual("rcl_interfaces/msg/ParameterEvent");
    expect(topics[1]?.serializationFormat).toEqual("cdr");
    expect(topics[1]?.offeredQosProfiles).toHaveLength(1);
    const qosProfile1 = topics[1]!.offeredQosProfiles[0]!;
    expect(qosProfile1.avoidRosNamespaceConventions).toEqual(false);
    expect(qosProfile1.deadline).toEqual({ sec: 2147483647, nsec: 4294967295 });
    expect(qosProfile1.depth).toEqual(0);
    expect(qosProfile1.durability).toEqual(true);
    expect(qosProfile1.history).toEqual(3);
    expect(qosProfile1.lifespan).toEqual({ sec: 2147483647, nsec: 4294967295 });
    expect(qosProfile1.liveliness).toEqual(true);
    expect(qosProfile1.livelinessLeaseDuration).toEqual({ sec: 2147483647, nsec: 4294967295 });
    expect(qosProfile1.reliability).toEqual(true);

    expect(topics[2]?.name).toEqual("/topic");
    expect(topics[2]?.type).toEqual("std_msgs/msg/String");
    expect(topics[2]?.serializationFormat).toEqual("cdr");
    expect(topics[2]?.offeredQosProfiles).toHaveLength(1);
    const qosProfile2 = topics[1]!.offeredQosProfiles[0]!;
    expect(qosProfile2.avoidRosNamespaceConventions).toEqual(false);
    expect(qosProfile2.deadline).toEqual({ sec: 2147483647, nsec: 4294967295 });
    expect(qosProfile2.depth).toEqual(0);
    expect(qosProfile2.durability).toEqual(true);
    expect(qosProfile2.history).toEqual(3);
    expect(qosProfile2.lifespan).toEqual({ sec: 2147483647, nsec: 4294967295 });
    expect(qosProfile2.liveliness).toEqual(true);
    expect(qosProfile2.livelinessLeaseDuration).toEqual({ sec: 2147483647, nsec: 4294967295 });
    expect(qosProfile2.reliability).toEqual(true);
  });

  it("should retrieve the bag time range", async () => {
    const db = new SqliteNodejs(TALKER_DB);
    await db.open();

    const [start, end] = await db.timeRange();
    expect(start).toEqual(BAG_START);
    expect(end).toEqual(BAG_END);

    const [start2, end2] = await db.timeRange();
    expect(start2).toEqual(start);
    expect(end2).toEqual(end);
  });

  it("should retrieve message counts", async () => {
    const db = new SqliteNodejs(TALKER_DB);
    await db.open();

    const counts = await db.messageCounts();
    expect(counts.size).toEqual(2);
    expect(counts.get("/rosout")).toEqual(10);
    expect(counts.get("/topic")).toEqual(10);
  });

  it("should read all messages", async () => {
    const db = new SqliteNodejs(TALKER_DB);
    await db.open();

    let count = 0;
    for await (const msg of db.readMessages()) {
      expect(typeof msg.topic.name).toEqual("string");
      expect(typeof msg.topic.type).toEqual("string");
      expect(isTimeInRangeInclusive(msg.timestamp, BAG_START, BAG_END)).toEqual(true);
      expect(msg.data.byteLength).toBeGreaterThanOrEqual(24);
      expect(msg.data.byteLength).toBeLessThanOrEqual(176);
      ++count;
    }
    expect(count).toEqual(20);
  });

  it("should read messages filtered by one topic", async () => {
    const db = new SqliteNodejs(TALKER_DB);
    await db.open();

    let count = 0;
    for await (const msg of db.readMessages({ topics: ["/topic"] })) {
      expect(msg.topic.name).toEqual("/topic");
      expect(msg.topic.type).toEqual("std_msgs/msg/String");
      expect(isTimeInRangeInclusive(msg.timestamp, BAG_START, BAG_END)).toEqual(true);
      expect(msg.data.byteLength).toEqual(24);
      ++count;
    }
    expect(count).toEqual(10);
  });

  it("should read messages filtered by two topics", async () => {
    const db = new SqliteNodejs(TALKER_DB);
    await db.open();

    let count = 0;
    for await (const msg of db.readMessages({ topics: ["/topic", "/rosout"] })) {
      expect(typeof msg.topic.name).toEqual("string");
      expect(typeof msg.topic.type).toEqual("string");
      expect(isTimeInRangeInclusive(msg.timestamp, BAG_START, BAG_END)).toEqual(true);
      expect(msg.data.byteLength).toBeGreaterThanOrEqual(24);
      expect(msg.data.byteLength).toBeLessThanOrEqual(176);
      ++count;
    }
    expect(count).toEqual(20);
  });

  it("should read messages filtered by start and end", async () => {
    const db = new SqliteNodejs(TALKER_DB);
    await db.open();

    const startTime = addTimes(BAG_START, { sec: 1, nsec: 0 });
    const endTime = addTimes(BAG_END, { sec: -2, nsec: 0 });

    let count = 0;
    for await (const _ of db.readMessages({ startTime })) {
      ++count;
    }
    expect(count).toEqual(16);

    count = 0;
    for await (const _ of db.readMessages({ endTime })) {
      ++count;
    }
    expect(count).toEqual(12);
  });

  it("should read messages with topic and timestamp filters", async () => {
    const db = new SqliteNodejs(TALKER_DB);
    await db.open();

    const topics = ["/rosout"];
    const startTime = addTimes(BAG_START, { sec: 1, nsec: 0 });
    const endTime = addTimes(BAG_END, { sec: -2, nsec: 0 });

    let count = 0;
    for await (const msg of db.readMessages({ topics, startTime, endTime })) {
      expect(msg.topic.name).toEqual("/rosout");
      expect(msg.topic.type).toEqual("rcl_interfaces/msg/Log");
      ++count;
    }
    expect(count).toEqual(4);
  });
});
