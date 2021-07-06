import { Time, add as addTimes, isGreaterThan, isTimeInRangeInclusive } from "@foxglove/rostime";
import path from "path";

import { Rosbag2 } from "./Rosbag2";
import { SqliteNodejs } from "./nodejs";
import { open } from "./nodejs/open";

const BAG_START: Time = { sec: 1585866235, nsec: 112411371 };
const BAG_END: Time = { sec: 1585866239, nsec: 643508139 };
const TOPICS = ["/rosout", "/topic"];
const DATATYPES = ["rcl_interfaces/msg/Log", "std_msgs/msg/String"];

describe("Rosbag2 single bag handling", () => {
  it("fails when missing metadata.yaml", async () => {
    const bag = new Rosbag2(".", [], (fileEntry) => new SqliteNodejs(fileEntry.relativePath));
    await expect(bag.open()).rejects.toBeDefined();
  });

  it("reads messages", async () => {
    const bagPath = path.join(__dirname, "..", "tests", "bags", "talker");
    const bag = await open(bagPath);

    expect(bag.baseDir).toEqual(bagPath);
    expect(bag.files.size).toEqual(4);
    expect(bag.files.get("metadata.yaml")).toBeDefined();
    expect(bag.files.get("talker.db3")).toBeDefined();

    let prevTime: Time = { sec: 0, nsec: 0 };
    for await (const msg of bag.readMessages()) {
      expect(isTimeInRangeInclusive(msg.timestamp, BAG_START, BAG_END)).toEqual(true);
      expect(isGreaterThan(msg.timestamp, prevTime)).toEqual(true);
      expect(TOPICS.includes(msg.topic.name)).toEqual(true);
      expect(DATATYPES.includes(msg.topic.type)).toEqual(true);
      prevTime = msg.timestamp;
    }
  });

  it("reads start/end times", async () => {
    const bagPath = path.join(__dirname, "..", "tests", "bags", "talker");
    const bag = await open(bagPath);

    expect(bag.metadata).toBeDefined();
    expect(bag.metadata!.startingTime).toEqual(BAG_START);
    expect(addTimes(bag.metadata!.startingTime!, bag.metadata!.duration!)).toEqual(BAG_END);

    const [startTime, endTime] = await bag.timeRange();
    expect(startTime).toEqual(BAG_START);
    expect(endTime).toEqual(BAG_END);
  });

  it("reads the topic list", async () => {
    const bagPath = path.join(__dirname, "..", "tests", "bags", "talker");
    const bag = await open(bagPath);

    const topics = await bag.readTopics();
    expect(topics.length).toEqual(3);
    expect(topics[0]!.name).toEqual("/rosout");
    expect(topics[1]!.name).toEqual("/parameter_events");
    expect(topics[2]!.name).toEqual("/topic");
  });

  it("reads the topic list", async () => {
    const bagPath = path.join(__dirname, "..", "tests", "bags", "talker");
    const bag = await open(bagPath);

    const counts = await bag.messageCounts();
    expect(counts.size).toEqual(2);
    expect(counts.get("/rosout")).toEqual(10);
    expect(counts.get("/topic")).toEqual(10);
  });
});
