import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['employee', 'manager'], required: true },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    balances: {
      casual: { type: Number, required: true, min: 0, default: 12 },
      sick: { type: Number, required: true, min: 0, default: 10 },
    },
    // Every leave mutation writes here first, serializing transactions for one employee.
    leaveRevision: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
