import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Announcement description is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: {
        values: [
          'General',
          'HR Updates',
          'Company Events',
          'Holidays',
          'Policy Updates',
          'Important Notices',
        ],
        message: '{VALUE} is not a valid announcement category',
      },
      default: 'General',
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH'],
        message: '{VALUE} is not a valid announcement priority',
      },
      default: 'MEDIUM',
      index: true,
    },
    targetAudience: {
      type: String,
      enum: {
        values: ['All Employees', 'Selected Department', 'Selected Employees'],
        message: '{VALUE} is not a valid target audience specification',
      },
      default: 'All Employees',
      index: true,
    },
    targetDepartment: {
      type: String,
      default: null,
      trim: true,
    },
    targetEmployeeIds: {
      type: [String],
      default: [],
    },
    publishDate: {
      type: String,
      required: [true, 'Publish date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Publish date must be formatted as YYYY-MM-DD'],
    },
    expiryDate: {
      type: String,
      default: null,
    },
    author: {
      type: String,
      required: [true, 'Author attribution is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
        message: '{VALUE} is not a valid announcement status',
      },
      default: 'PUBLISHED',
      index: true,
    },
    pinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    readBy: {
      type: [String], // Array of employeeIds who have viewed/read this bulletin
      default: [],
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

// Compound index for querying published announcements sorted by pinned status and publishDate
announcementSchema.index({ status: 1, pinned: -1, publishDate: -1 });

export const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;
