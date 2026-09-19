#!/usr/bin/env node
/**
 * Start the embedded MongoDB-compatible development server.
 *
 * Usage: node bin/devdb.js [--port 27017] [--data ./data] [--verbose]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DevMongoServer } from '../lib/server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { port: 27017, data: path.join(__dirname, '..', 'data'), verbose: false, host: '127.0.0.1' };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--port' || arg === '-p') args.port = Number(argv[++i]);
    else if (arg === '--data' || arg === '-d') args.data = path.resolve(argv[++i]);
    else if (arg === '--host') args.host = argv[++i];
    else if (arg === '--verbose' || arg === '-v') args.verbose = true;
  }
  return args;
}

const options = parseArgs(process.argv);
const server = new DevMongoServer({
  dataDir: options.data,
  port: options.port,
  host: options.host,
  verbose: options.verbose,
});

await server.listen();
console.log(`[devdb] MongoDB-compatible server listening on ${options.host}:${options.port}`);
console.log(`[devdb] data directory: ${options.data}`);

const shutdown = async (signal) => {
  console.log(`[devdb] received ${signal}, flushing to disk...`);
  await server.close();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
