import React, { useRef } from 'react';
import {
  Printer,
  Download,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  X,
  FileText
} from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { formatCurrency } from '../../services/payrollService';

export default function PayslipModal({ isOpen, onClose, payrollRecord }) {
  if (!isOpen || !payrollRecord) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const id = payrollRecord.payrollId || payrollRecord.id;
    window.open(`/api/payroll/${id}/pdf`, '_blank');
  };

  const isPaid = payrollRecord.paymentStatus === 'PAID';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 print:my-0 print:border-none print:shadow-none">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-brand-navy text-white px-6 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <FileText className="w-4 h-4 text-brand-blue" />
            <span>Digital Compensation Voucher • {payrollRecord.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={Download}
              onClick={handleDownloadPdf}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs py-1 h-7"
            >
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={Printer}
              onClick={handlePrint}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs py-1 h-7"
            >
              Print
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div id="printable-payslip" className="p-6 sm:p-10 space-y-6 text-brand-text">
          
          {/* Header & Company Brand */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-navy flex items-center justify-center text-white font-bold text-sm">
                  VP
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-brand-navy">VISARTECH People</h2>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-brand-blue">
                    One Platform. Every People Operation.
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 pt-2 leading-relaxed">
                <p className="font-semibold text-slate-700">VISARTECH Solutions Inc.</p>
                <p>100 S Wacker Drive, Suite 1400</p>
                <p>Chicago, Illinois 60606, United States</p>
                <p>EIN: 36-9812450 • contact@visartech.demo</p>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1.5">
              <span className="inline-block px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-lg text-xs font-extrabold uppercase tracking-wider border border-brand-blue/20">
                Payslip &bull; {payrollRecord.payrollMonthLabel}
              </span>
              <div className="text-xs text-slate-500 pt-1">
                <p>Voucher Reference: <strong className="font-mono text-slate-800">{payrollRecord.id}</strong></p>
                <p>Disbursement Date: <strong className="text-slate-800">{payrollRecord.disbursementDate}</strong></p>
                <p>Payment Mode: <span className="font-medium text-slate-700">{payrollRecord.paymentMethod}</span></p>
              </div>
            </div>
          </div>

          {/* Demo Disclaimer Watermark Bar */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-2 text-[11px] text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>DEMO SAMPLE:</strong> Fictional compensation document generated for demonstration purposes. Not a legally binding tax voucher.
              </span>
            </div>
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700">Non-Statutory</span>
          </div>

          {/* Employee & Bank Particulars Grid */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Employee Name</span>
              <span className="font-bold text-slate-900 text-sm">{payrollRecord.employeeName}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Employee ID</span>
              <span className="font-mono font-bold text-brand-blue">{payrollRecord.employeeId}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
              <span className="font-semibold text-slate-800">{payrollRecord.department}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Designation</span>
              <span className="font-semibold text-slate-800 truncate block" title={payrollRecord.employeeRole}>
                {payrollRecord.employeeRole}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Institution</span>
              <span className="font-medium text-slate-700">{payrollRecord.bankName || 'Chase Bank Chicago'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Number</span>
              <span className="font-mono text-slate-700">{payrollRecord.accountNumberMasked || '••••4821'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pay Cycle Window</span>
              <span className="font-medium text-slate-700">{payrollRecord.payrollMonth}-01 &rarr; {payrollRecord.disbursementDate}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Disbursement Status</span>
              {isPaid ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disbursed (Paid)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Clock className="w-3 h-3 text-amber-600" /> Pending Processing
                </span>
              )}
            </div>
          </div>

          {/* Itemized Dual-Column Financials: Earnings vs Deductions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Earnings Column */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-brand-navy uppercase tracking-wider">Gross Earnings Breakdown</span>
                <span className="text-[11px] font-semibold text-slate-400">Amount (USD)</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="px-4 py-2 flex justify-between">
                  <span className="text-slate-600">Base Salary</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(payrollRecord.basicSalary)}</span>
                </div>
                <div className="px-4 py-2 flex justify-between">
                  <span className="text-slate-600">Housing Allowance</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(payrollRecord.housingAllowance)}</span>
                </div>
                <div className="px-4 py-2 flex justify-between">
                  <span className="text-slate-600">Other Regular Allowances</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(payrollRecord.otherAllowances)}</span>
                </div>
                <div className="px-4 py-2 flex justify-between">
                  <span className="text-slate-600">Performance Bonus</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(payrollRecord.bonus)}</span>
                </div>
              </div>
              <div className="bg-blue-50/60 px-4 py-3 border-t border-slate-200 flex justify-between text-xs font-bold text-brand-navy">
                <span>Total Gross Earnings</span>
                <span className="text-brand-blue font-extrabold">{formatCurrency(payrollRecord.grossSalary)}</span>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-brand-navy uppercase tracking-wider">Withholdings &amp; Deductions</span>
                <span className="text-[11px] font-semibold text-slate-400">Amount (USD)</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="px-4 py-2 flex justify-between">
                  <span className="text-slate-600">Federal/State Tax Withholding (Demo)</span>
                  <span className="font-semibold text-rose-600">-{formatCurrency(payrollRecord.taxDeduction)}</span>
                </div>
                <div className="px-4 py-2 flex justify-between">
                  <span className="text-slate-600">Health Insurance &amp; 401(k) Match</span>
                  <span className="font-semibold text-rose-600">-{formatCurrency(payrollRecord.otherDeductions)}</span>
                </div>
                <div className="px-4 py-2 flex justify-between text-slate-400 italic">
                  <span>Additional Voluntary Reductions</span>
                  <span>$0.00</span>
                </div>
                <div className="px-4 py-2 flex justify-between text-slate-400 italic">
                  <span>Unpaid Leave Recovery</span>
                  <span>$0.00</span>
                </div>
              </div>
              <div className="bg-rose-50/60 px-4 py-3 border-t border-slate-200 flex justify-between text-xs font-bold text-rose-900">
                <span>Total Deductions</span>
                <span className="text-rose-600 font-extrabold">-{formatCurrency(payrollRecord.totalDeductions)}</span>
              </div>
            </div>

          </div>

          {/* Net Pay Highlight Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#101B35] to-[#1A294C] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-300">
                Take-Home Net Salary Disbursed
              </span>
              <p className="text-xs text-slate-300 mt-0.5">
                Calculated Formula: Gross (${payrollRecord.grossSalary?.toLocaleString()}) - Deductions (${payrollRecord.totalDeductions?.toLocaleString()})
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-2xl sm:text-3xl font-mono font-black text-white">
                {formatCurrency(payrollRecord.netSalary)}
              </div>
              <span className="text-[10px] text-slate-400">
                Deposited via Direct Deposit ACH
              </span>
            </div>
          </div>

          {/* Signatures & Footer Notice */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px] text-slate-400">
            <div>
              <p className="font-semibold text-slate-700 mb-6">Authorized Signatory (HR / Finance)</p>
              <div className="border-b border-slate-300 w-44 pb-1">
                <span className="font-serif italic text-slate-600">Alex Morgan</span>
              </div>
              <p className="mt-1">Head of People &amp; Compensation</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-700 mb-6">Employee Acceptance</p>
              <div className="border-b border-slate-300 w-44 ml-auto pb-1">
                <span className="font-mono text-slate-500">Electronically Verified</span>
              </div>
              <p className="mt-1">VISARTECH Self-Service Portal</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            This digital compensation voucher was generated by VISARTECH People SaaS. Confidential document intended solely for {payrollRecord.employeeName}.
          </div>

        </div>

        {/* Modal Bottom Actions (Hidden on print) */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">Ctrl+P</kbd> or click Print to download PDF.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Printer}
              onClick={handlePrint}
            >
              Print / Save PDF
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
