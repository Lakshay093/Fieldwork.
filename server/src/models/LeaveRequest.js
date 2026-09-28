import mongoose from 'mongoose';

const utcMidnight = {
  validator: (date) =>
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0,
  message: 'Dates must be normalized to UTC midnight.',
};

const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: { type: String, enum: ['casual', 'sick'], required: true },
    startDate: { type: Date, required: true, validate: utcMidnight },
    endDate: { type: Date, required: true, validate: utcMidnight },
    workingDays: { type: Number, required: true, min: 1 },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    decidedAt: { type: Date, default: null },
    managerComment: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true },
);

leaveSchema.index({ employeeId: 1, status: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ status: 1, employeeId: 1, createdAt: -1 });
export const LeaveRequest = mongoose.model('LeaveRequest', leaveSchema);
