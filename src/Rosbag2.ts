import path from "path";

import { FileEntry } from "./types";

export class Rosbag2 {
  readonly baseDir: string;
  readonly files: Readonly<Map<string, FileEntry>>;

  constructor(baseDir: string, files: FileEntry[]) {
    this.baseDir = baseDir;
    this.files = new Map<string, FileEntry>(
      files.map((f) => [path.relative(".", f.relativePath), f]),
    );

    const metadataFile = this.files.get("metadata.yaml");
    if (metadataFile == undefined) {
      throw new Error(`Cannot construct Rosbag2Reader without metadata.yaml`);
    }
  }
}
