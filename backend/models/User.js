import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: false, // Optional until invited employee accepts invitation and sets password
      select: false, // Excluded from normal query results for security
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['HR_ADMIN', 'EMPLOYEE'],
        message: '{VALUE} is not a valid role',
      },
      default: 'EMPLOYEE',
      index: true,
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true,
    },
    employmentType: {
      type: String,
      enum: ['Full-Time', 'Part-Time', 'Contract'],
      default: 'Full-Time',
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    reportingManager: {
      type: String,
      default: 'Sarah Jenkins (VP of People)',
      trim: true,
    },
    employmentStatus: {
      type: String,
      enum: ['Active', 'On Leave', 'Terminated'],
      default: 'Active',
      index: true,
    },
    phone: {
      type: String,
      default: '+1 (312) 555-0100',
      trim: true,
    },
    address: {
      type: String,
      default: '100 S Wacker Dr',
      trim: true,
    },
    city: {
      type: String,
      default: 'Chicago',
      trim: true,
    },
    state: {
      type: String,
      default: 'IL',
      trim: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    invitationToken: {
      type: String,
      select: false,
    },
    invitationExpires: {
      type: Date,
      select: false,
    },
    invitationStatus: {
      type: String,
      enum: ['PENDING', 'ACCEPTED'],
      default: 'ACCEPTED',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.invitationToken;
        delete ret.invitationExpires;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual for full display name
userSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Compare password instance method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash || !candidatePassword) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static helper to hash passwords
userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Generate and hash employee invitation token (48-hour expiration)
userSchema.methods.generateInvitationToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.invitationToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  this.invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
  this.invitationStatus = 'PENDING';
  return rawToken;
};

// Generate and hash email verification token (24-hour expiration)
userSchema.methods.generateEmailVerificationToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return rawToken;
};

// Generate and hash password reset token (30-minute expiration)
userSchema.methods.generatePasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  return rawToken;
};

export const User = mongoose.model('User', userSchema);
export default User;
