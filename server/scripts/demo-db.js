import { MongoMemoryReplSet } from 'mongodb-memory-server';
import net from 'node:net';

await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', () =>
    reject(
      new Error(
        'Port 27018 is already in use. Stop the previous demo database before starting another.',
      ),
    ),
  );
  probe.listen(27018, '127.0.0.1', () => probe.close(resolve));
});

const database = await MongoMemoryReplSet.create({
  instanceOpts: [{ port: 27018 }],
  replSet: { name: 'rs0', count: 1, storageEngine: 'wiredTiger' },
});
process.stdout.write(
  'Temporary demo database ready at mongodb://127.0.0.1:27018/fieldwork?replicaSet=rs0\nKeep this terminal open. Data is discarded when the process stops.\n',
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await database.stop();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
