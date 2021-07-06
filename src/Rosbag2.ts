import { Time, isLessThan as isTimeLessThan } from "@foxglove/rostime";
import path from "path";

import { MessageIterator } from "./MessageIterator";
import { parseMetadata } from "./metadata";
import {
  FileEntry,
  Message,
  MessageReadOptions,
  Metadata,
  RawMessage,
  SqliteDb,
  TopicDefinition,
} from "./types";

type SqliteDbFactory = (fileEntry: FileEntry) => SqliteDb;

export class Rosbag2 {
  readonly baseDir: string;
  readonly files: Readonly<Map<string, FileEntry>>;
  private sqliteDbFactory: SqliteDbFactory;
  private metadata_?: Metadata;
  private databases_?: SqliteDb[];

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

    // Fall back to loading all .db3 files in the rosbag directory
    const dbFiles =
      this.getFiles(this.metadata_?.relativeFilePaths) ??
      Array.from(this.files.values()).filter((entry) => entry.relativePath.endsWith(".db3"));
    this.databases_ = dbFiles.map((entry) => this.sqliteDbFactory(entry));

    for (const db of this.databases_) {
      await db.open();
    }
  }

  readTopics(): Promise<TopicDefinition[]> {
    if (this.databases_ == undefined) {
      throw new Error("Cannot read topics before opening rosbag");
    }

    if (this.databases_.length === 0) {
      return Promise.resolve([]);
    }

    const firstDb = this.databases_[0]!;
    return firstDb.readTopics();
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

  private getFiles(relativePaths?: string[]): FileEntry[] | undefined {
    if (relativePaths == undefined) {
      return undefined;
    }

    const entries: FileEntry[] = [];
    for (const relativePath of relativePaths) {
      const normalizedPath = path.relative(".", relativePath);
      const entry = this.files.get(normalizedPath);
      if (entry != undefined) {
        entries.push(entry);
      }
    }

    return entries.length > 0 ? entries : undefined;
  }

  private decodeMessage = (rawMessage: RawMessage): unknown => {
    const metadata = this.metadata_;
    if (metadata == undefined) {
      throw new Error("Cannot decode messages before opening rosbag");
    }

    return undefined;
  };
}

function minTime(a: Time, b: Time): Time {
  return isTimeLessThan(a, b) ? a : b;
}

function maxTime(a: Time, b: Time): Time {
  return isTimeLessThan(a, b) ? b : a;
}
