import mongoose from 'mongoose';

const salaryStructureSchema = new mongoose.Schema(
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
    basicSalary: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: [0, 'Basic salary must be a non-negative number'],
    },
    housingAllowance: {
      type: Number,
      default: 0,
      min: [0, 'Housing allowance must be a non-negative number'],
    },
    otherAllowances: {
      type: Number,
      default: 0,
      min: [0, 'Other allowances must be a non-negative number'],
    },
    bonus: {
      type: Number,
      default: 0,
      min: [0, 'Performance bonus must be a non-negative number'],
    },
    taxDeduction: {
      type: Number,
      default: 0,
      min: [0, 'Tax deduction must be a non-negative number'],
    },
    otherDeductions: {
      type: Number,
      default: 0,
      min: [0, 'Other deductions must be a non-negative number'],
    },
    bankName: {
      type: String,
      default: 'JPMorgan Chase (Demo Direct Deposit)',
      trim: true,
    },
    accountNumberMasked: {
      type: String,
      default: '•••• •••• 6192',
      trim: true,
      match: [/^•+\s?•+\s?\d{4}$/, 'Account number must be safely masked (e.g. •••• •••• 6192)'],
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

// Virtual for Gross Salary
salaryStructureSchema.virtual('grossSalary').get(function () {
  const basic = this.basicSalary || 0;
  const housing = this.housingAllowance || 0;
  const other = this.otherAllowances || 0;
  const bonus = this.bonus || 0;
  return basic + housing + other + bonus;
});

// Virtual for Total Deductions
salaryStructureSchema.virtual('totalDeductions').get(function () {
  const tax = this.taxDeduction || 0;
  const other = this.otherDeductions || 0;
  return tax + other;
});

// Virtual for Net Salary
salaryStructureSchema.virtual('netSalary').get(function () {
  return (this.grossSalary || 0) - (this.totalDeductions || 0);
});

export const SalaryStructure = mongoose.model('SalaryStructure', salaryStructureSchema);
export default SalaryStructure;
