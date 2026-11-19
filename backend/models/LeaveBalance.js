import mongoose from 'mongoose';

const balanceCategorySchema = new mongoose.Schema(
  {
    total: {
      type: Number,
      required: true,
      min: [0, 'Total entitlement cannot be negative'],
    },
    used: {
      type: Number,
      default: 0,
      min: [0, 'Used days cannot be negative'],
    },
    remaining: {
      type: Number,
      required: true,
      min: [0, 'Remaining leave balance cannot become negative'],
    },
  },
  { _id: false }
);

const leaveBalanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    casual: {
      type: balanceCategorySchema,
      default: () => ({ total: 6, used: 0, remaining: 6 }),
    },
    sick: {
      type: balanceCategorySchema,
      default: () => ({ total: 8, used: 0, remaining: 8 }),
    },
    paid: {
      type: balanceCategorySchema,
      default: () => ({ total: 14, used: 0, remaining: 14 }),
    },
    unpaid: {
      used: {
        type: Number,
        default: 0,
        min: [0, 'Unpaid days cannot be negative'],
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual for overall remaining leave balance across all paid categories
leaveBalanceSchema.virtual('totalRemaining').get(function () {
  const casual = this.casual?.remaining || 0;
  const sick = this.sick?.remaining || 0;
  const paid = this.paid?.remaining || 0;
  return casual + sick + paid;
});

/**
 * Safely and atomically deduct leave days, guaranteeing no race conditions or negative balances
 */
leaveBalanceSchema.statics.deductBalance = async function (employeeId, leaveType, days) {
  const type = leaveType.toUpperCase();
  const numDays = Number(days);

  if (numDays <= 0) {
    throw new Error('Deduction days must be greater than zero');
  }

  if (type === 'UNPAID') {
    return this.findOneAndUpdate(
      { employeeId },
      { $inc: { 'unpaid.used': numDays } },
      { new: true }
    );
  }

  const categoryMap = { CASUAL: 'casual', SICK: 'sick', PAID: 'paid' };
  const cat = categoryMap[type];
  if (!cat) {
    throw new Error(`Invalid leave type: ${leaveType}`);
  }

  // Atomic condition ensures remaining balance is strictly >= requested days
  const updated = await this.findOneAndUpdate(
    {
      employeeId,
      [`${cat}.remaining`]: { $gte: numDays },
    },
    {
      $inc: {
        [`${cat}.used`]: numDays,
        [`${cat}.remaining`]: -numDays,
      },
    },
    { new: true }
  );

  if (!updated) {
    const current = await this.findOne({ employeeId });
    if (!current) throw new Error(`Leave balance record not found for ${employeeId}`);
    const available = current[cat]?.remaining || 0;
    throw new Error(`Insufficient ${type} leave balance. Available: ${available}, Requested: ${numDays}`);
  }

  return updated;
};

/**
 * Safely and atomically restore leave days upon cancellation or rejection of an approved leave
 */
leaveBalanceSchema.statics.restoreBalance = async function (employeeId, leaveType, days) {
  const type = leaveType.toUpperCase();
  const numDays = Number(days);

  if (numDays <= 0) {
    throw new Error('Restoration days must be greater than zero');
  }

  if (type === 'UNPAID') {
    return this.findOneAndUpdate(
      { employeeId, 'unpaid.used': { $gte: numDays } },
      { $inc: { 'unpaid.used': -numDays } },
      { new: true }
    );
  }

  const categoryMap = { CASUAL: 'casual', SICK: 'sick', PAID: 'paid' };
  const cat = categoryMap[type];
  if (!cat) {
    throw new Error(`Invalid leave type: ${leaveType}`);
  }

  const updated = await this.findOneAndUpdate(
    {
      employeeId,
      [`${cat}.used`]: { $gte: numDays },
    },
    {
      $inc: {
        [`${cat}.used`]: -numDays,
        [`${cat}.remaining`]: numDays,
      },
    },
    { new: true }
  );

  return updated;
};

export const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);
export default LeaveBalance;
