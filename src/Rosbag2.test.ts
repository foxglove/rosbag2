import path from "path";

import { Rosbag2 } from "./Rosbag2";
import { SqliteNodejs } from "./nodejs";
import { open } from "./nodejs/open";

describe("Rosbag2", () => {
  it("fails when missing metadata.yaml", async () => {
    const bag = new Rosbag2(".", [], (fileEntry) => new SqliteNodejs(fileEntry.relativePath));
    await expect(bag.open()).rejects.toBeDefined();
  });

  it("reads a simple bag file", async () => {
    const bagPath = path.join(__dirname, "..", "tests", "bags", "talker");
    const bag = await open(bagPath);

    expect(bag.baseDir).toEqual(bagPath);
    expect(bag.files.size).toEqual(4);
    expect(bag.files.get("metadata.yaml")).toBeDefined();
  });
});
