import mongoose from 'mongoose';

const payrollRecordSchema = new mongoose.Schema(
  {
    payrollId: {
      type: String,
      required: [true, 'Payroll ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    payrollMonth: {
      type: String, // Normalized 'YYYY-MM' representing disbursement cycle
      required: [true, 'Payroll month is required (YYYY-MM)'],
      match: [/^\d{4}-\d{2}$/, 'Payroll month must be formatted as YYYY-MM (e.g. 2026-11)'],
      index: true,
    },
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
    basicSalary: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: [0, 'Basic salary must be non-negative'],
    },
    allowances: {
      type: Number,
      default: 0,
      min: [0, 'Allowances must be non-negative'],
    },
    grossSalary: {
      type: Number,
      required: [true, 'Gross salary is required'],
      min: [0, 'Gross salary must be non-negative'],
    },
    deductions: {
      type: Number,
      default: 0,
      min: [0, 'Deductions must be non-negative'],
    },
    netSalary: {
      type: Number,
      required: [true, 'Net salary is required'],
      min: [0, 'Net salary must be non-negative'],
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['PENDING', 'PAID'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'PENDING',
      index: true,
    },
    disbursementDate: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
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

// Compound Unique Index: Prevents duplicate payroll records for the same employee in the same month
payrollRecordSchema.index({ employeeId: 1, payrollMonth: 1 }, { unique: true });

export const PayrollRecord = mongoose.model('PayrollRecord', payrollRecordSchema);
export default PayrollRecord;
