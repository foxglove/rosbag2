import path from "path";

import { parseMetadata } from "./metadata";
import { FileEntry, Metadata, SqliteDb } from "./types";

type SqliteDbFactory = (fileEntry: FileEntry) => SqliteDb;

export class Rosbag2 {
  readonly baseDir: string;
  readonly files: Readonly<Map<string, FileEntry>>;
  private metadata_?: Metadata;
  private sqliteDbFactory: SqliteDbFactory;

  get metadata(): Metadata | undefined {
    return this.metadata_;
  }

  constructor(baseDir: string, files: FileEntry[], sqliteDbFactory: SqliteDbFactory) {
    this.baseDir = baseDir;
    this.files = new Map<string, FileEntry>(
      files.map((f) => [path.relative(".", f.relativePath), f]),
    );
    this.sqliteDbFactory = sqliteDbFactory;
  }

  async open(): Promise<void> {
    const metadataFile = this.files.get("metadata.yaml");
    if (metadataFile == undefined) {
      throw new Error(`Cannot construct Rosbag2Reader without metadata.yaml`);
    }
    const metadataStr = await metadataFile.file.readAsText();

    this.metadata_ = parseMetadata(metadataStr);
    if (this.metadata_ == undefined) {
      // Fall back to loading all .db3 files in the rosbag directory
    }
  }
}
