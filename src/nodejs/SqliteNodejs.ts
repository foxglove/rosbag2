import { Time, fromNanoSec, toNanoSec } from "@foxglove/rostime";
import SQLite from "better-sqlite3";

import { MessageIterator, MessageRow } from "../MessageIterator";
import { parseQosProfiles } from "../parseQosProfiles";
import type { RawMessage, SqliteDb, SqliteMessageReadOptions, TopicDefinition } from "../types";

type DbContext = {
  db: SQLite.Database;
  timeRangeStatement: SQLite.Statement;
  messageCountsStatement: SQLite.Statement;
  idToTopic: Map<bigint, TopicDefinition>;
  topicNameToId: Map<string, bigint>;
};

type TopicRow = {
  id: bigint;
  name: string;
  type: string;
  serialization_format: string;
  offered_qos_profiles: string;
};

export class SqliteNodejs implements SqliteDb {
  readonly filename: string;
  private context?: DbContext;

  constructor(filename: string) {
    this.filename = filename;
  }

  open(): Promise<void> {
    if (this.context != undefined) {
      return Promise.resolve();
    }

    const db = new SQLite(this.filename, { fileMustExist: true, readonly: true });
    db.defaultSafeIntegers(); // return bigints by default
    const timeRangeStatement = db.prepare(
      "select min(timestamp) as start, max(timestamp) as end from messages",
    );
    const messageCountsStatement = db.prepare(`
      select topics.name as name,count(*) as count
      from messages
      inner join topics on messages.topic_id = topics.id
      group by topics.id`);

    // Retrieve all of the topics
    const idToTopic = new Map<bigint, TopicDefinition>();
    const topicNameToId = new Map<string, bigint>();
    const topicRows = db
      .prepare("select id,name,type,serialization_format,offered_qos_profiles from topics")
      .all() as TopicRow[];
    for (const row of topicRows) {
      const { id, name, type, serialization_format, offered_qos_profiles } = row;
      const offeredQosProfiles = parseQosProfiles(offered_qos_profiles);
      const topic = { name, type, serializationFormat: serialization_format, offeredQosProfiles };
      idToTopic.set(id, topic);
      topicNameToId.set(name, id);
    }

    this.context = {
      db,
      timeRangeStatement,
      messageCountsStatement,
      idToTopic,
      topicNameToId,
    };
    return Promise.resolve();
  }

  readTopics(): Promise<TopicDefinition[]> {
    if (this.context == undefined) {
      throw new Error(`Call open() before reading topics`);
    }
    return Promise.resolve(Array.from(this.context.idToTopic.values()));
  }

  readMessages(opts: SqliteMessageReadOptions = {}): AsyncIterableIterator<RawMessage> {
    if (this.context == undefined) {
      throw new Error(`Call open() before reading messages`);
    }
    const db = this.context.db;
    const idToTopic = this.context.idToTopic;
    const topicNameToId = this.context.topicNameToId;

    // Build a SQL query and bind parameters
    let args: (string | bigint)[] = [];
    let query = `select topic_id,timestamp,data from messages`;
    if (opts.startTime != undefined) {
      query += ` where timestamp >= ?`;
      args.push(toNanoSec(opts.startTime));
    }
    if (opts.endTime != undefined) {
      if (args.length === 0) {
        query += ` where timestamp < ?`;
      } else {
        query += ` and timestamp < ?`;
      }
      args.push(toNanoSec(opts.endTime));
    }
    if (opts.topics != undefined) {
      // Map topics to topic_ids
      const topicIds: bigint[] = [];
      for (const topicName of opts.topics) {
        const topicId = topicNameToId.get(topicName);
        if (topicId != undefined) {
          topicIds.push(topicId);
        }
      }

      if (topicIds.length === 0) {
        if (args.length === 0) {
          query += ` where topic_id = NULL`;
        } else {
          query += ` and topic_id = NULL`;
        }
      } else if (topicIds.length === 1) {
        if (args.length === 0) {
          query += ` where topic_id = ?`;
        } else {
          query += ` and topic_id = ?`;
        }
        args.push(topicIds[0]!);
      } else {
        if (args.length === 0) {
          query += ` where topic_id in (${topicIds.map(() => "?").join(",")})`;
        } else {
          query += ` and topic_id in (${topicIds.map(() => "?").join(",")})`;
        }
        args = args.concat(topicIds);
      }
    }

    const statement = db.prepare(query);
    const iterator = statement.iterate(args) as IterableIterator<MessageRow>;
    return new MessageIterator(iterator, idToTopic);
  }

  timeRange(): Promise<[min: Time, max: Time]> {
    if (this.context == undefined) {
      throw new Error(`Call open() before retrieving the time range`);
    }
    const res = this.context.timeRangeStatement.get() as { start: bigint; end: bigint };
    return Promise.resolve([fromNanoSec(res.start), fromNanoSec(res.end)]);
  }

  messageCounts(): Promise<Map<string, number>> {
    if (this.context == undefined) {
      throw new Error(`Call open() before retrieving message counts`);
    }
    const rows = this.context.messageCountsStatement.all() as { name: string; count: bigint }[];
    const counts = new Map<string, number>();
    for (const { name, count } of rows) {
      counts.set(name, Number(count));
    }
    return Promise.resolve(counts);
  }
}
