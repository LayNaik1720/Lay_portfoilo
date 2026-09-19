/**
 * Durable append-log storage. Each database is one JSONL-ish BSON log file;
 * state is rebuilt on boot and compacted when the log grows large.
 */
import fs from 'node:fs';
import path from 'node:path';
import { BSON, ObjectId } from 'bson';
import { cloneValue } from './value.js';

export class Collection {
  constructor(name) {
    this.name = name;
    this.docs = new Map(); // key -> document
    this.indexes = new Map();
  }

  static keyOf(id) {
    if (id instanceof ObjectId) return `o:${id.toHexString()}`;
    if (id instanceof Date) return `d:${id.getTime()}`;
    if (id === null) return 'null';
    if (typeof id === 'object') return `j:${JSON.stringify(id)}`;
    return `${typeof id}:${String(id)}`;
  }

  all() {
    return [...this.docs.values()];
  }

  get(id) {
    return this.docs.get(Collection.keyOf(id));
  }

  set(doc) {
    this.docs.set(Collection.keyOf(doc._id), doc);
  }

  delete(id) {
    return this.docs.delete(Collection.keyOf(id));
  }

  get size() {
    return this.docs.size;
  }
}

export class Database {
  constructor(name) {
    this.name = name;
    this.collections = new Map();
  }

  collection(name, create = true) {
    if (!this.collections.has(name) && create) {
      this.collections.set(name, new Collection(name));
    }
    return this.collections.get(name);
  }

  dropCollection(name) {
    return this.collections.delete(name);
  }
}

export class Storage {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.databases = new Map();
    this.streams = new Map();
    this.opCounts = new Map();
    fs.mkdirSync(dataDir, { recursive: true });
    this.loadAll();
  }

  database(name) {
    if (!this.databases.has(name)) this.databases.set(name, new Database(name));
    return this.databases.get(name);
  }

  fileFor(dbName) {
    return path.join(this.dataDir, `${encodeURIComponent(dbName)}.bsonlog`);
  }

  loadAll() {
    const files = fs.existsSync(this.dataDir) ? fs.readdirSync(this.dataDir) : [];
    for (const file of files) {
      if (!file.endsWith('.bsonlog')) continue;
      const dbName = decodeURIComponent(file.replace(/\.bsonlog$/, ''));
      this.loadDatabase(dbName);
    }
  }

  loadDatabase(dbName) {
    const file = this.fileFor(dbName);
    if (!fs.existsSync(file)) return;
    const buffer = fs.readFileSync(file);
    const db = this.database(dbName);
    let offset = 0;
    let ops = 0;

    while (offset + 4 <= buffer.length) {
      const size = buffer.readInt32LE(offset);
      if (size <= 0 || offset + size > buffer.length) break;
      let entry;
      try {
        entry = BSON.deserialize(buffer.subarray(offset, offset + size), {
          promoteValues: true,
          promoteBuffers: true,
          promoteLongs: true,
        });
      } catch {
        break;
      }
      offset += size;
      ops += 1;
      this.applyLogEntry(db, entry);
    }
    this.opCounts.set(dbName, ops);
  }

  applyLogEntry(db, entry) {
    const { op, c: collectionName, d: doc, i: id } = entry;
    switch (op) {
      case 'u': {
        const col = db.collection(collectionName);
        col.set(normalize(doc));
        break;
      }
      case 'd': {
        const col = db.collection(collectionName, false);
        if (col) col.delete(normalize({ _id: id })._id);
        break;
      }
      case 'dc': {
        db.dropCollection(collectionName);
        break;
      }
      case 'ddb': {
        db.collections.clear();
        break;
      }
      default:
        break;
    }
  }

  stream(dbName) {
    if (!this.streams.has(dbName)) {
      this.streams.set(dbName, fs.createWriteStream(this.fileFor(dbName), { flags: 'a' }));
    }
    return this.streams.get(dbName);
  }

  append(dbName, entry) {
    const buf = BSON.serialize(entry);
    this.stream(dbName).write(buf);
    const count = (this.opCounts.get(dbName) || 0) + 1;
    this.opCounts.set(dbName, count);
    const db = this.databases.get(dbName);
    const liveDocs = db ? [...db.collections.values()].reduce((acc, c) => acc + c.size, 0) : 0;
    if (count > 2000 && count > liveDocs * 4) this.compact(dbName);
  }

  logUpsert(dbName, collectionName, doc) {
    this.append(dbName, { op: 'u', c: collectionName, d: doc });
  }

  logDelete(dbName, collectionName, id) {
    this.append(dbName, { op: 'd', c: collectionName, i: id });
  }

  logDropCollection(dbName, collectionName) {
    this.append(dbName, { op: 'dc', c: collectionName });
  }

  logDropDatabase(dbName) {
    this.append(dbName, { op: 'ddb', c: '' });
  }

  /** Rewrite the log as a minimal snapshot of live documents. */
  compact(dbName) {
    const db = this.databases.get(dbName);
    if (!db) return;
    const tmp = `${this.fileFor(dbName)}.tmp`;
    const chunks = [];
    for (const [collectionName, col] of db.collections) {
      for (const doc of col.all()) {
        chunks.push(BSON.serialize({ op: 'u', c: collectionName, d: doc }));
      }
    }
    fs.writeFileSync(tmp, Buffer.concat(chunks));
    const existing = this.streams.get(dbName);
    if (existing) {
      existing.end();
      this.streams.delete(dbName);
    }
    fs.renameSync(tmp, this.fileFor(dbName));
    this.opCounts.set(dbName, chunks.length);
  }

  close() {
    for (const stream of this.streams.values()) stream.end();
    this.streams.clear();
  }
}

function normalize(doc) {
  return cloneValue(doc);
}
