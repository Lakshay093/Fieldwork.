import mongoose from 'mongoose';
import { User } from './models/User.js';
import { LeaveRequest } from './models/LeaveRequest.js';

export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') {
    await mongoose.disconnect();
    throw new Error(
      'MongoDB must be a replica set for safe balance transactions. Use Atlas or npm run db:demo -w server.',
    );
  }
  await Promise.all([User.init(), LeaveRequest.init()]);
}
