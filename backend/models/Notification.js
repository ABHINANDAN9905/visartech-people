import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: String,
      required: [true, 'Recipient identifier is required (e.g. EMP-006 or HR_ADMIN)'],
      uppercase: true,
      trim: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: {
        values: ['EMPLOYEE', 'HR_ADMIN', 'ALL'],
        message: '{VALUE} is not a valid recipient role',
      },
      default: 'EMPLOYEE',
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: [
          'leave_approved',
          'leave_rejected',
          'task_assigned',
          'task_deadline',
          'announcement',
          'payroll_published',
          'feedback_response',
        ],
        message: '{VALUE} is not a valid notification type',
      },
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    link: {
      type: String,
      default: '/dashboard',
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    eventId: {
      type: String,
      default: null,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: -1,
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

// Compound index for fast retrieval of unread notifications per recipient
notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

// Unique Partial Index: eventId must be unique ONLY when present and non-null
notificationSchema.index(
  { eventId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      eventId: { $type: 'string', $gt: '' },
    },
  }
);

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
