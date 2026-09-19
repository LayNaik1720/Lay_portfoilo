/**
 * MongoDB command implementations executed against the storage engine.
 */
import { ObjectId, Long, Timestamp } from 'bson';
import { matchesQuery, buildComparator } from './match.js';
import { applyUpdate, buildUpsertDocument, isUpdateDocument } from './update.js';
import { runPipeline } from './aggregate.js';
import { project } from './project.js';
import { cloneValue, getPath, valuesEqual } from './value.js';

const MAX_BSON = 16 * 1024 * 1024;

/*
 * Note on heartbeats: we deliberately do NOT advertise `topologyVersion` in the
 * `hello` reply.
 *
 * Returning it opts the driver into the *streaming* heartbeat protocol, where it
 * sends an awaitable `hello` carrying `maxAwaitTimeMS` and expects the server to
 * hold that response open until the topology actually changes. This server
 * answers immediately, so the driver treated every heartbeat as a topology
 * change and rebuilt its connection pool roughly every ten seconds — visible as
 * endless "[db] connected / [db] disconnected" churn in the application log.
 *
 * Omitting the field makes the driver fall back to ordinary polling heartbeats,
 * which this server models correctly.
 */

export class CommandError extends Error {
  constructor(code, codeName, message) {
    super(message);
    this.code = code;
    this.codeName = codeName;
  }
}

export class CommandRunner {
  constructor(storage, options = {}) {
    this.storage = storage;
    this.startTime = Date.now();
    this.cursors = new Map();
    this.nextCursorId = 1n;
    this.log = options.log || (() => {});
  }

  /** Entry point: dispatch one command document. */
  run(dbName, command) {
    const name = Object.keys(command)[0];
    const handler = HANDLERS[name] || HANDLERS[name.toLowerCase()];
    if (!handler) {
      throw new CommandError(59, 'CommandNotFound', `no such command: '${name}'`);
    }
    return handler.call(this, dbName, command);
  }

  collectionFor(dbName, collectionName, create = true) {
    return this.storage.database(dbName).collection(collectionName, create);
  }

  persistUpsert(dbName, collectionName, doc) {
    this.storage.logUpsert(dbName, collectionName, doc);
  }

  persistDelete(dbName, collectionName, id) {
    this.storage.logDelete(dbName, collectionName, id);
  }

  /** Enforce unique indexes before writing. */
  assertUnique(col, doc, ignoreId) {
    for (const index of col.indexes.values()) {
      if (!index.unique) continue;
      const fields = Object.keys(index.key);
      if (fields.includes('_id')) continue;
      const values = fields.map((f) => getPath(doc, f));
      if (index.sparse && values.every((v) => v === undefined)) continue;
      if (values.every((v) => v === undefined || v === null) && fields.length === 1) continue;

      for (const other of col.docs.values()) {
        if (ignoreId !== undefined && valuesEqual(other._id, ignoreId)) continue;
        const otherValues = fields.map((f) => getPath(other, f));
        if (fields.every((f, i) => valuesEqual(values[i], otherValues[i]))) {
          const keyDesc = fields.map((f, i) => `${f}: ${formatKey(values[i])}`).join(', ');
          throw new CommandError(
            11000,
            'DuplicateKey',
            `E11000 duplicate key error collection: ${col.name} index: ${index.name} dup key: { ${keyDesc} }`,
          );
        }
      }
    }
  }

  makeCursor(dbName, collectionName, docs, batchSize) {
    const size = batchSize === undefined ? 101 : Number(batchSize);
    const firstBatch = size === 0 ? [] : docs.slice(0, size);
    const rest = docs.slice(firstBatch.length);
    let id = 0n;
    if (rest.length > 0) {
      id = this.nextCursorId;
      this.nextCursorId += 1n;
      this.cursors.set(id.toString(), { docs: rest, ns: `${dbName}.${collectionName}` });
    }
    return {
      cursor: {
        firstBatch,
        id: new Long(id),
        ns: `${dbName}.${collectionName}`,
      },
      ok: 1,
    };
  }
}

function formatKey(v) {
  if (v instanceof ObjectId) return `ObjectId('${v.toHexString()}')`;
  if (typeof v === 'string') return `"${v}"`;
  return String(v);
}

function okReply(extra = {}) {
  return { ok: 1, ...extra };
}

function writeError(index, err) {
  return {
    index,
    code: err instanceof CommandError ? err.code : 8,
    errmsg: err.message,
  };
}

const HANDLERS = {
  // ---- discovery / handshake ----
  ismaster(dbName, cmd) { return HANDLERS.hello.call(this, dbName, cmd); },
  isMaster(dbName, cmd) { return HANDLERS.hello.call(this, dbName, cmd); },
  hello() {
    return okReply({
      isWritablePrimary: true,
      ismaster: true,
      maxBsonObjectSize: MAX_BSON,
      maxMessageSizeBytes: 48000000,
      maxWriteBatchSize: 100000,
      localTime: new Date(),
      logicalSessionTimeoutMinutes: 30,
      connectionId: 1,
      minWireVersion: 0,
      maxWireVersion: 21,
      readOnly: false,
      msg: undefined,
    });
  },
  buildInfo() {
    return okReply({
      version: '7.0.0',
      versionArray: [7, 0, 0, 0],
      gitVersion: 'devdb',
      bits: 64,
      debug: false,
      maxBsonObjectSize: MAX_BSON,
      storageEngines: ['devdb'],
      javascriptEngine: 'none',
      ok: 1,
    });
  },
  buildinfo(dbName, cmd) { return HANDLERS.buildInfo.call(this, dbName, cmd); },
  ping() { return okReply(); },
  getParameter() { return okReply({ featureCompatibilityVersion: { version: '7.0' } }); },
  serverStatus() {
    return okReply({
      host: 'devdb',
      version: '7.0.0',
      process: 'devdb',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      connections: { current: 1, available: 1000, totalCreated: 1 },
      storageEngine: { name: 'devdb', persistent: true },
    });
  },
  hostInfo() { return okReply({ system: { hostname: 'devdb' }, os: { type: 'Linux' }, extra: {} }); },
  whatsmyuri() { return okReply({ you: '127.0.0.1:0' }); },
  getLog() { return okReply({ totalLinesWritten: 0, log: [] }); },
  endSessions() { return okReply(); },
  refreshSessions() { return okReply(); },
  killCursors(dbName, cmd) {
    const ids = (cmd.cursors || []).map((c) => c.toString());
    const killed = [];
    for (const id of ids) {
      if (this.cursors.delete(id)) killed.push(new Long(BigInt(id)));
    }
    return okReply({ cursorsKilled: killed, cursorsNotFound: [], cursorsAlive: [], cursorsUnknown: [] });
  },
  connectionStatus() {
    return okReply({ authInfo: { authenticatedUsers: [], authenticatedUserRoles: [] } });
  },
  atlasVersion() { throw new CommandError(59, 'CommandNotFound', 'no such command: atlasVersion'); },

  // ---- reads ----
  find(dbName, cmd) {
    const col = this.collectionFor(dbName, cmd.find, false);
    let docs = col ? col.all() : [];
    docs = docs.filter((d) => matchesQuery(d, cmd.filter || {}));

    if (cmd.sort) docs = [...docs].sort(buildComparator(cmd.sort));
    if (cmd.skip) docs = docs.slice(Number(cmd.skip));
    if (cmd.limit) {
      const lim = Number(cmd.limit);
      docs = lim < 0 ? docs.slice(0, -lim) : docs.slice(0, lim);
    }
    if (cmd.projection) {
      docs = docs.map((d) => project(d, cmd.projection, null));
    } else {
      docs = docs.map(cloneValue);
    }
    return this.makeCursor(dbName, cmd.find, docs, cmd.batchSize);
  },

  getMore(dbName, cmd) {
    const id = cmd.getMore.toString();
    const entry = this.cursors.get(id);
    if (!entry) {
      throw new CommandError(43, 'CursorNotFound', `cursor id ${id} not found`);
    }
    const size = cmd.batchSize === undefined ? 101 : Number(cmd.batchSize);
    const batch = entry.docs.slice(0, size);
    entry.docs = entry.docs.slice(batch.length);
    let cursorId = BigInt(id);
    if (entry.docs.length === 0) {
      this.cursors.delete(id);
      cursorId = 0n;
    }
    return okReply({ cursor: { nextBatch: batch, id: new Long(cursorId), ns: entry.ns } });
  },

  count(dbName, cmd) {
    const col = this.collectionFor(dbName, cmd.count, false);
    let docs = col ? col.all() : [];
    docs = docs.filter((d) => matchesQuery(d, cmd.query || cmd.filter || {}));
    if (cmd.skip) docs = docs.slice(Number(cmd.skip));
    if (cmd.limit) docs = docs.slice(0, Number(cmd.limit));
    return okReply({ n: docs.length });
  },

  distinct(dbName, cmd) {
    const col = this.collectionFor(dbName, cmd.distinct, false);
    const docs = (col ? col.all() : []).filter((d) => matchesQuery(d, cmd.query || {}));
    const values = [];
    for (const doc of docs) {
      const v = getPath(doc, cmd.key);
      const list = Array.isArray(v) ? v : [v];
      for (const item of list) {
        if (item === undefined) continue;
        if (!values.some((existing) => valuesEqual(existing, item))) values.push(item);
      }
    }
    return okReply({ values });
  },

  aggregate(dbName, cmd) {
    const collectionName = typeof cmd.aggregate === 'string' ? cmd.aggregate : '__none__';
    const col = this.collectionFor(dbName, collectionName, false);
    const source = col ? col.all() : [];
    const db = this.storage.database(dbName);
    const ctx = {
      lookup: (from) => {
        const target = db.collection(from, false);
        return target ? target.all() : [];
      },
    };
    const result = runPipeline(source, cmd.pipeline || [], ctx);

    // $out / $merge write the result back into a collection.
    const lastStage = (cmd.pipeline || [])[cmd.pipeline.length - 1];
    if (lastStage && (lastStage.$out || lastStage.$merge)) {
      const targetName = lastStage.$out
        ? (typeof lastStage.$out === 'string' ? lastStage.$out : lastStage.$out.coll)
        : (typeof lastStage.$merge === 'string' ? lastStage.$merge : lastStage.$merge.into);
      const target = this.collectionFor(dbName, targetName);
      if (lastStage.$out) {
        target.docs.clear();
        this.storage.logDropCollection(dbName, targetName);
      }
      for (const doc of result) {
        if (doc._id === undefined) doc._id = new ObjectId();
        target.set(doc);
        this.persistUpsert(dbName, targetName, doc);
      }
      return this.makeCursor(dbName, collectionName, [], cmd.cursor?.batchSize);
    }

    return this.makeCursor(dbName, collectionName, result, cmd.cursor?.batchSize);
  },

  // ---- writes ----
  insert(dbName, cmd) {
    const col = this.collectionFor(dbName, cmd.insert);
    const errors = [];
    let inserted = 0;

    for (let index = 0; index < cmd.documents.length; index += 1) {
      try {
        const doc = cloneValue(cmd.documents[index]);
        if (doc._id === undefined) doc._id = new ObjectId();
        if (col.get(doc._id)) {
          throw new CommandError(11000, 'DuplicateKey',
            `E11000 duplicate key error collection: ${dbName}.${cmd.insert} index: _id_ dup key: { _id: ${formatKey(doc._id)} }`);
        }
        this.assertUnique(col, doc);
        col.set(doc);
        this.persistUpsert(dbName, cmd.insert, doc);
        inserted += 1;
      } catch (err) {
        errors.push(writeError(index, err));
        // An ordered batch stops at the first failure but still reports it.
        if (cmd.ordered !== false) break;
      }
    }

    return okReply({ n: inserted, ...(errors.length ? { writeErrors: errors } : {}) });
  },

  update(dbName, cmd) {
    const col = this.collectionFor(dbName, cmd.update);
    let matched = 0;
    let modified = 0;
    const upserted = [];
    const errors = [];

    cmd.updates.forEach((spec, index) => {
      try {
        const candidates = col.all().filter((d) => matchesQuery(d, spec.q || {}));
        const targets = spec.multi ? candidates : candidates.slice(0, 1);

        if (targets.length === 0 && spec.upsert) {
          const doc = Array.isArray(spec.u)
            ? runPipeline([buildUpsertDocument(spec.q, {}, spec.arrayFilters)], spec.u)[0]
            : buildUpsertDocument(spec.q, spec.u, spec.arrayFilters);
          this.assertUnique(col, doc);
          col.set(doc);
          this.persistUpsert(dbName, cmd.update, doc);
          upserted.push({ index, _id: doc._id });
          return;
        }

        for (const target of targets) {
          matched += 1;
          const before = JSON.stringify(cloneValue(target));
          const updated = Array.isArray(spec.u)
            ? runPipeline([target], spec.u)[0]
            : applyUpdate(cloneValue(target), spec.u, {
              arrayFilters: spec.arrayFilters,
              matchedQuery: spec.q,
            });
          if (updated._id === undefined) updated._id = target._id;
          this.assertUnique(col, updated, target._id);

          if (!valuesEqual(updated._id, target._id)) {
            col.delete(target._id);
            this.persistDelete(dbName, cmd.update, target._id);
          }
          col.set(updated);
          this.persistUpsert(dbName, cmd.update, updated);
          if (JSON.stringify(updated) !== before) modified += 1;
        }
      } catch (err) {
        errors.push(writeError(index, err));
      }
    });

    return okReply({
      n: matched + upserted.length,
      nModified: modified,
      ...(upserted.length ? { upserted } : {}),
      ...(errors.length ? { writeErrors: errors } : {}),
    });
  },

  delete(dbName, cmd) {
    const col = this.collectionFor(dbName, cmd.delete, false);
    if (!col) return okReply({ n: 0 });
    let removed = 0;

    for (const spec of cmd.deletes) {
      const matches = col.all().filter((d) => matchesQuery(d, spec.q || {}));
      const targets = spec.limit === 1 ? matches.slice(0, 1) : matches;
      for (const doc of targets) {
        col.delete(doc._id);
        this.persistDelete(dbName, cmd.delete, doc._id);
        removed += 1;
      }
    }
    return okReply({ n: removed });
  },

  findAndModify(dbName, cmd) {
    const col = this.collectionFor(dbName, cmd.findAndModify);
    const matches = col.all().filter((d) => matchesQuery(d, cmd.query || {}));
    const sorted = cmd.sort ? [...matches].sort(buildComparator(cmd.sort)) : matches;
    const target = sorted[0];

    if (!target) {
      if (cmd.upsert && !cmd.remove) {
        const doc = Array.isArray(cmd.update)
          ? runPipeline([buildUpsertDocument(cmd.query, {}, cmd.arrayFilters)], cmd.update)[0]
          : buildUpsertDocument(cmd.query, cmd.update, cmd.arrayFilters);
        this.assertUnique(col, doc);
        col.set(doc);
        this.persistUpsert(dbName, cmd.findAndModify, doc);
        return okReply({
          value: cmd.new ? project(doc, cmd.fields, null) : null,
          lastErrorObject: { n: 1, updatedExisting: false, upserted: doc._id },
        });
      }
      return okReply({ value: null, lastErrorObject: { n: 0, updatedExisting: false } });
    }

    if (cmd.remove) {
      col.delete(target._id);
      this.persistDelete(dbName, cmd.findAndModify, target._id);
      return okReply({
        value: cmd.fields ? project(target, cmd.fields, null) : cloneValue(target),
        lastErrorObject: { n: 1 },
      });
    }

    const before = cloneValue(target);
    const updated = Array.isArray(cmd.update)
      ? runPipeline([target], cmd.update)[0]
      : applyUpdate(cloneValue(target), cmd.update, {
        arrayFilters: cmd.arrayFilters,
        matchedQuery: cmd.query,
      });
    if (updated._id === undefined) updated._id = target._id;
    this.assertUnique(col, updated, target._id);
    col.set(updated);
    this.persistUpsert(dbName, cmd.findAndModify, updated);

    const result = cmd.new ? updated : before;
    return okReply({
      value: cmd.fields ? project(result, cmd.fields, null) : cloneValue(result),
      lastErrorObject: { n: 1, updatedExisting: true },
    });
  },

  // ---- DDL ----
  create(dbName, cmd) {
    this.collectionFor(dbName, cmd.create);
    return okReply();
  },
  drop(dbName, cmd) {
    const db = this.storage.database(dbName);
    db.dropCollection(cmd.drop);
    this.storage.logDropCollection(dbName, cmd.drop);
    return okReply({ ns: `${dbName}.${cmd.drop}`, nIndexesWas: 1 });
  },
  dropDatabase(dbName) {
    const db = this.storage.database(dbName);
    db.collections.clear();
    this.storage.logDropDatabase(dbName);
    return okReply({ dropped: dbName });
  },
  createIndexes(dbName, cmd) {
    const col = this.collectionFor(dbName, cmd.createIndexes);
    const before = col.indexes.size;
    for (const spec of cmd.indexes) {
      const name = spec.name || Object.entries(spec.key).map(([k, v]) => `${k}_${v}`).join('_');
      col.indexes.set(name, { name, key: spec.key, unique: !!spec.unique, sparse: !!spec.sparse });
    }
    return okReply({
      numIndexesBefore: before + 1,
      numIndexesAfter: col.indexes.size + 1,
      createdCollectionAutomatically: false,
    });
  },
  listIndexes(dbName, cmd) {
    const col = this.collectionFor(dbName, cmd.listIndexes, false);
    const indexes = [{ v: 2, key: { _id: 1 }, name: '_id_' }];
    if (col) {
      for (const idx of col.indexes.values()) {
        indexes.push({
          v: 2,
          key: idx.key,
          name: idx.name,
          ...(idx.unique ? { unique: true } : {}),
          ...(idx.sparse ? { sparse: true } : {}),
        });
      }
    }
    return this.makeCursor(dbName, cmd.listIndexes, indexes, cmd.cursor?.batchSize);
  },
  dropIndexes(dbName, cmd) {
    const col = this.collectionFor(dbName, cmd.dropIndexes, false);
    if (col) {
      if (cmd.index === '*') col.indexes.clear();
      else col.indexes.delete(cmd.index);
    }
    return okReply({ nIndexesWas: 1 });
  },
  listCollections(dbName, cmd) {
    const db = this.storage.database(dbName);
    let items = [...db.collections.keys()].map((name) => ({
      name,
      type: 'collection',
      options: {},
      info: { readOnly: false, uuid: new ObjectId() },
      idIndex: { v: 2, key: { _id: 1 }, name: '_id_' },
    }));
    if (cmd.filter) items = items.filter((i) => matchesQuery(i, cmd.filter));
    return this.makeCursor(dbName, '$cmd.listCollections', items, cmd.cursor?.batchSize);
  },
  listDatabases() {
    const databases = [...this.storage.databases.keys()].map((name) => ({
      name, sizeOnDisk: 1024, empty: false,
    }));
    if (!databases.some((d) => d.name === 'admin')) databases.push({ name: 'admin', sizeOnDisk: 1024, empty: false });
    return okReply({ databases, totalSize: 1024 * databases.length });
  },
  collStats(dbName, cmd) {
    const col = this.collectionFor(dbName, cmd.collStats, false);
    return okReply({ ns: `${dbName}.${cmd.collStats}`, count: col ? col.size : 0, size: 0, storageSize: 0, nindexes: 1, totalIndexSize: 0 });
  },
  dbStats(dbName) {
    const db = this.storage.database(dbName);
    const objects = [...db.collections.values()].reduce((acc, c) => acc + c.size, 0);
    return okReply({ db: dbName, collections: db.collections.size, objects, dataSize: 0, storageSize: 0, indexes: 0 });
  },

  // ---- transactions (single-node, best effort) ----
  commitTransaction() { return okReply(); },
  abortTransaction() { return okReply(); },
  saslStart() { throw new CommandError(59, 'CommandNotFound', 'authentication is disabled'); },
};

HANDLERS.getmore = HANDLERS.getMore;
HANDLERS.findandmodify = HANDLERS.findAndModify;
HANDLERS.createindexes = HANDLERS.createIndexes;
HANDLERS.listindexes = HANDLERS.listIndexes;
HANDLERS.dropindexes = HANDLERS.dropIndexes;
HANDLERS.listcollections = HANDLERS.listCollections;
HANDLERS.listdatabases = HANDLERS.listDatabases;
HANDLERS.dropdatabase = HANDLERS.dropDatabase;
HANDLERS.collstats = HANDLERS.collStats;
HANDLERS.dbstats = HANDLERS.dbStats;
HANDLERS.killcursors = HANDLERS.killCursors;
HANDLERS.serverstatus = HANDLERS.serverStatus;
HANDLERS.hostinfo = HANDLERS.hostInfo;
HANDLERS.getparameter = HANDLERS.getParameter;
HANDLERS.connectionstatus = HANDLERS.connectionStatus;
HANDLERS.endsessions = HANDLERS.endSessions;
HANDLERS.refreshsessions = HANDLERS.refreshSessions;
HANDLERS.committransaction = HANDLERS.commitTransaction;
HANDLERS.aborttransaction = HANDLERS.abortTransaction;
HANDLERS.getlog = HANDLERS.getLog;

export { HANDLERS, Timestamp };
