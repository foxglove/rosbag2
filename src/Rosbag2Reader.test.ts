import { Rosbag2Reader } from "./Rosbag2Reader";

describe("Rosbag2Reader", () => {
  it("fails when missing metadata.yaml", () => {
    expect(() => new Rosbag2Reader(new Map())).toThrow();
  });
});
