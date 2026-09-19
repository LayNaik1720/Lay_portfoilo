/**
 * MongoDB wire-protocol TCP server.
 * Speaks OP_MSG (opcode 2013) and OP_QUERY (2004) handshakes, which is
 * everything a modern driver such as mongoose/node-mongodb needs.
 */
import net from 'node:net';
import { BSON, Long } from 'bson';
import { Storage } from './storage.js';
import { CommandRunner, CommandError } from './commands.js';

const OP_REPLY = 1;
const OP_QUERY = 2004;
const OP_MSG = 2013;
const OP_COMPRESSED = 2012;

// Promote BSON numeric wrappers to native JS values so documents round-trip as
// plain objects; drivers re-encode them on the way out.
const DESERIALIZE_OPTIONS = { promoteValues: true, promoteBuffers: true, promoteLongs: true };

export class DevMongoServer {
  constructor({ dataDir, port = 27017, host = '127.0.0.1', verbose = false } = {}) {
    this.storage = new Storage(dataDir);
    this.runner = new CommandRunner(this.storage);
    this.port = port;
    this.host = host;
    this.verbose = verbose;
    this.requestId = 1;
    this.server = net.createServer((socket) => this.handleConnection(socket));
  }

  listen() {
    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.port, this.host, () => {
        this.server.removeListener('error', reject);
        resolve(this);
      });
    });
  }

  async close() {
    this.storage.close();
    await new Promise((resolve) => this.server.close(resolve));
  }

  handleConnection(socket) {
    socket.setNoDelay(true);
    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length >= 16) {
        const messageLength = buffer.readInt32LE(0);
        if (messageLength <= 0 || messageLength > 64 * 1024 * 1024) {
          socket.destroy();
          return;
        }
        if (buffer.length < messageLength) break;

        const message = buffer.subarray(0, messageLength);
        buffer = buffer.subarray(messageLength);

        try {
          this.handleMessage(socket, message);
        } catch (err) {
          if (this.verbose) console.error('[devdb] message error:', err);
        }
      }
    });

    socket.on('error', () => socket.destroy());
  }

  handleMessage(socket, message) {
    const requestId = message.readInt32LE(4);
    const opCode = message.readInt32LE(12);

    if (opCode === OP_MSG) {
      const { command, dbName } = this.parseOpMsg(message);
      const reply = this.execute(dbName, command);
      socket.write(this.encodeOpMsg(requestId, reply));
      return;
    }

    if (opCode === OP_QUERY) {
      const { command, dbName } = this.parseOpQuery(message);
      const reply = this.execute(dbName, command);
      socket.write(this.encodeOpReply(requestId, reply));
      return;
    }

    if (opCode === OP_COMPRESSED) {
      // Compression is never negotiated (we omit it from hello), so this is unexpected.
      socket.write(this.encodeOpMsg(requestId, {
        ok: 0, errmsg: 'compression not supported', code: 59, codeName: 'CommandNotFound',
      }));
    }
  }

  parseOpMsg(message) {
    let offset = 16;
    const flagBits = message.readUInt32LE(offset);
    offset += 4;

    let command = null;
    const sequences = {};

    while (offset < message.length) {
      const kind = message.readUInt8(offset);
      offset += 1;

      if (kind === 0) {
        const size = message.readInt32LE(offset);
        command = BSON.deserialize(message.subarray(offset, offset + size), DESERIALIZE_OPTIONS);
        offset += size;
      } else if (kind === 1) {
        const sectionSize = message.readInt32LE(offset);
        const sectionEnd = offset + sectionSize;
        let cursor = offset + 4;
        const nul = message.indexOf(0, cursor);
        const identifier = message.toString('utf8', cursor, nul);
        cursor = nul + 1;
        const docs = [];
        while (cursor < sectionEnd) {
          const size = message.readInt32LE(cursor);
          docs.push(BSON.deserialize(message.subarray(cursor, cursor + size), DESERIALIZE_OPTIONS));
          cursor += size;
        }
        sequences[identifier] = docs;
        offset = sectionEnd;
      } else {
        break;
      }
      if (flagBits & 0x1 && offset + 4 >= message.length) break;
    }

    if (command) {
      for (const [key, docs] of Object.entries(sequences)) {
        command[key] = (command[key] || []).concat(docs);
      }
    }

    const dbName = (command && command.$db) || 'test';
    return { command: command || {}, dbName };
  }

  parseOpQuery(message) {
    let offset = 16;
    offset += 4; // flags
    const nul = message.indexOf(0, offset);
    const fullCollectionName = message.toString('utf8', offset, nul);
    offset = nul + 1;
    offset += 8; // numberToSkip + numberToReturn
    const size = message.readInt32LE(offset);
    const command = BSON.deserialize(message.subarray(offset, offset + size), DESERIALIZE_OPTIONS);
    const dbName = fullCollectionName.split('.')[0] || 'admin';
    return { command, dbName };
  }

  execute(dbName, command) {
    const name = Object.keys(command)[0];
    try {
      const reply = this.runner.run(dbName, command);
      if (this.verbose) console.log(`[devdb] ${dbName}.${name} -> ok`);
      return reply;
    } catch (err) {
      if (this.verbose) console.log(`[devdb] ${dbName}.${name} -> error ${err.message}`);
      if (err instanceof CommandError) {
        return { ok: 0, errmsg: err.message, code: err.code, codeName: err.codeName };
      }
      return { ok: 0, errmsg: err.message, code: 8, codeName: 'UnknownError' };
    }
  }

  encodeOpMsg(responseTo, document) {
    const body = BSON.serialize(document, { ignoreUndefined: true });
    const header = Buffer.alloc(21);
    const totalLength = 16 + 4 + 1 + body.length;
    header.writeInt32LE(totalLength, 0);
    header.writeInt32LE(this.requestId++, 4);
    header.writeInt32LE(responseTo, 8);
    header.writeInt32LE(OP_MSG, 12);
    header.writeUInt32LE(0, 16); // flagBits
    header.writeUInt8(0, 20); // section kind: body
    return Buffer.concat([header, body]);
  }

  encodeOpReply(responseTo, document) {
    const body = BSON.serialize(document, { ignoreUndefined: true });
    const header = Buffer.alloc(36);
    const totalLength = 36 + body.length;
    header.writeInt32LE(totalLength, 0);
    header.writeInt32LE(this.requestId++, 4);
    header.writeInt32LE(responseTo, 8);
    header.writeInt32LE(OP_REPLY, 12);
    header.writeInt32LE(8, 16); // responseFlags: AwaitCapable
    header.writeBigInt64LE(0n, 20); // cursorId
    header.writeInt32LE(0, 28); // startingFrom
    header.writeInt32LE(1, 32); // numberReturned
    return Buffer.concat([header, body]);
  }
}

export { Long };
