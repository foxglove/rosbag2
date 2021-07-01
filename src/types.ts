import { Time } from "@foxglove/rostime";

// Topic and Message interfaces

export type QosProfile = {
  history: number;
  depth: number;
  reliability: boolean;
  durability: boolean;
  deadline?: Time;
  lifespan?: Time;
  liveliness: boolean;
  livelinessLeaseDuration?: Time;
  avoidRosNamespaceConventions: boolean;
};

export type TopicDefinition = {
  name: string;
  type: string;
  serializationFormat: string;
  offeredQosProfiles: QosProfile[];
};

export type RawMessage = {
  topic: Readonly<TopicDefinition>;
  timestamp: Time;
  data: Uint8Array;
};

// Filesystem interfaces

export interface Filelike {
  read(offset: number, length: number): Promise<Uint8Array>;
  size(): Promise<number>;
}

export interface FileEntry {
  relativePath: string;
  file: Filelike;
}

// Sqlite interfaces

export type SqliteMessageReadOptions = {
  topics?: string[];
  startTime?: Time;
  endTime?: Time;
};

export interface SqliteDb {
  open(): Promise<void>;
  readTopics(): Promise<TopicDefinition[]>;
  readMessages(opts: SqliteMessageReadOptions): AsyncIterableIterator<RawMessage>;
  timeRange(): Promise<[min: Time, max: Time]>;
  messageCounts(): Promise<Map<string, number>>;
}
