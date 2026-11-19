import mongoose from 'mongoose';

const internalNoteSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const responseSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    respondedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: {
        values: [
          'Workplace',
          'Management',
          'Work Environment',
          'Suggestions',
          'Technical Issues',
          'Other',
        ],
        message: '{VALUE} is not a valid feedback category',
      },
      default: 'Workplace',
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Feedback message is required'],
      trim: true,
    },
    priority: {
      type: String,
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'MEDIUM',
    },
    isAnonymous: {
      type: Boolean,
      default: false,
      index: true,
    },
    employeeId: {
      type: String,
      default: null, // Nullable for anonymous feedback
      index: true,
    },
    employeeName: {
      type: String,
      default: null,
      trim: true,
    },
    employeeDepartment: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['NEW', 'UNDER_REVIEW', 'RESPONDED', 'RESOLVED'],
        message: '{VALUE} is not a valid feedback status',
      },
      default: 'NEW',
      index: true,
    },
    internalNotes: {
      type: [internalNoteSchema],
      default: [],
    },
    response: {
      type: responseSchema,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        // Strict Privacy Scrub: If anonymous, scrub submitter identity completely
        if (ret.isAnonymous) {
          ret.employeeId = null;
          ret.employeeName = 'Anonymous Colleague';
          ret.employeeDepartment = 'Confidential';
        }
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);
// Pre-validate hook: enforce complete identity scrub in database record if isAnonymous is true
feedbackSchema.pre('validate', function () {
  if (this.isAnonymous) {
    this.employeeId = null;
    this.employeeName = 'Anonymous Colleague';
    this.employeeDepartment = 'Confidential';
  }
});

// Pre-update hook: ensure query-level updates cannot compromise anonymity
feedbackSchema.pre(['updateOne', 'findOneAndUpdate'], function () {
  const update = this.getUpdate();
  if (!update) return;

  const isAnon = update.isAnonymous ?? update.$set?.isAnonymous;
  if (isAnon === true) {
    if (update.$set) {
      update.$set.employeeId = null;
      update.$set.employeeName = 'Anonymous Colleague';
      update.$set.employeeDepartment = 'Confidential';
    } else {
      update.employeeId = null;
      update.employeeName = 'Anonymous Colleague';
      update.employeeDepartment = 'Confidential';
    }
  }
});
export const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback; 