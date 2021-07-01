import path from "path";

import { Rosbag2 } from "./Rosbag2";
import { open } from "./nodejs/open";

describe("Rosbag2", () => {
  it("fails when missing metadata.yaml", () => {
    expect(() => new Rosbag2(".", [])).toThrow();
  });

  it("reads a simple bag file", async () => {
    const bagPath = path.join(__dirname, "..", "tests", "bags", "talker");
    const bag = await open(bagPath);

    expect(bag.baseDir).toEqual(bagPath);
    expect(bag.files.size).toEqual(4);
    expect(bag.files.get("metadata.yaml")).toBeDefined();
  });
});
