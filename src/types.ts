import { Duration, Time } from "@foxglove/rostime";

export enum QosPolicyDurability {
  SystemDefault = 0,
  TransientLocal = 1,
  Volatile = 2,
  Unknown = 3,
}

export enum QosPolicyHistory {
  SystemDefault = 0,
  KeepLast = 1,
  KeepAll = 2,
  Unknown = 3,
}

export enum QosPolicyLiveliness {
  SystemDefault = 0,
  Automatic = 1,
  ManualByTopic = 3,
  Unknown = 4,
}

export enum QosPolicyReliability {
  SystemDefault = 0,
  Reliable = 1,
  BestEffort = 2,
  Unknown = 3,
}

export type Message = {
  topic: Readonly<TopicDefinition>;
  timestamp: Time;
  data: unknown;
};

export type MessageReadOptions = {
  topics?: string[];
  startTime?: Time;
  endTime?: Time;
  rawMessages?: boolean;
};

// Bag metadata

export type Metadata = {
  version?: number;
  storageIdentifier?: "sqlite3" | string;
  relativeFilePaths: string[];
  duration?: Duration;
  startingTime?: Time;
  messageCount?: number;
  topicsWithMessageCount: { topic: TopicDefinition; messageCount: number }[];
  compressionFormat?: string;
  compressionMode?: string;
};

// Topic and Message interfaces

export type QosProfile = {
  history: QosPolicyHistory;
  depth: number;
  reliability: QosPolicyReliability;
  durability: QosPolicyDurability;
  deadline?: Duration;
  lifespan?: Duration;
  liveliness: QosPolicyLiveliness;
  livelinessLeaseDuration?: Duration;
  avoidRosNamespaceConventions: boolean;
};

export type TopicDefinition = {
  name: string;
  type: string;
  serializationFormat: "cdr" | string;
  offeredQosProfiles: QosProfile[];
};

export type RawMessage = {
  topic: Readonly<TopicDefinition>;
  timestamp: Time;
  data: Uint8Array;
};

// Filesystem interfaces

export interface Filelike {
  read(offset?: number, length?: number): Promise<Uint8Array>;
  readAsText(): Promise<string>;
  size(): Promise<number>;
  close(): Promise<void>;
}

export interface FileEntry {
  relativePath: string;
  file: Filelike;
}

// Sqlite interfaces

export interface SqliteDb {
  open(): Promise<void>;
  close(): Promise<void>;
  readTopics(): Promise<TopicDefinition[]>;
  readMessages(opts: MessageReadOptions): AsyncIterableIterator<RawMessage>;
  timeRange(): Promise<[min: Time, max: Time]>;
  messageCounts(): Promise<Map<string, number>>;
}
