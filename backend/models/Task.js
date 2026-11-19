import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: [true, 'Comment author is required'],
      trim: true,
    },
    text: {
      type: String,
      required: [true, 'Comment message is required'],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: [true, 'Task ID is required (e.g. TSK-101)'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Task description is required'],
      trim: true,
    },
    assignedEmployeeId: {
      type: String,
      required: [true, 'Assigned employee ID is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    assignedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    priority: {
      type: String,
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        message: '{VALUE} is not a valid priority level',
      },
      default: 'MEDIUM',
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'],
        message: '{VALUE} is not a valid task status',
      },
      default: 'TODO',
      index: true,
    },
    startDate: {
      type: String,
      required: [true, 'Start date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    dueDate: {
      type: String,
      required: [true, 'Due date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    estimatedHours: {
      type: Number,
      default: 8,
      min: [0, 'Estimated hours cannot be negative'],
    },
    progress: {
      type: Number,
      default: 0,
      min: [0, 'Progress percentage cannot be less than 0'],
      max: [100, 'Progress percentage cannot exceed 100'],
    },
    comments: {
      type: [commentSchema],
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

// Compound index for fast queries of an employee's tasks by status
taskSchema.index({ assignedEmployeeId: 1, status: 1 });

export const Task = mongoose.model('Task', taskSchema);
export default Task;
