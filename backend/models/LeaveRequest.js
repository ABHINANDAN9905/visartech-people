import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    leaveType: {
      type: String,
      required: [true, 'Leave type is required'],
      enum: {
        values: ['CASUAL', 'SICK', 'PAID', 'UNPAID'],
        message: '{VALUE} is not a valid leave type',
      },
      index: true,
    },
    startDate: {
      type: String,
      required: [true, 'Start date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    endDate: {
      type: String,
      required: [true, 'End date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    days: {
      type: Number,
      required: [true, 'Leave duration in days is required'],
      min: [0.5, 'Minimum leave duration is 0.5 days'],
    },
    reason: {
      type: String,
      required: [true, 'Reason for leave application is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
        message: '{VALUE} is not a valid leave status',
      },
      default: 'PENDING',
      index: true,
    },
    reviewedBy: {
      type: String,
      default: null,
      trim: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewerComments: {
      type: String,
      default: '',
      trim: true,
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

// Helpful compound index for filtering requests by status per employee
leaveRequestSchema.index({ employeeId: 1, status: 1 });

export const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
export default LeaveRequest;
