import path from "path";

import { SqliteNodejs } from "./SqliteNodejs";

const TALKER_DB = path.join(__dirname, "..", "..", "tests", "bags", "talker", "talker.db3");

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
});
