import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  CalendarCheck, 
  BadgeDollarSign, 
  Sparkles, 
  Plus, 
  Check, 
  Trash2, 
  Download, 
  Mail, 
  Lock, 
  Briefcase, 
  ArrowUpRight,
  Filter,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Textarea from '../components/common/Textarea';
import Card, { CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../components/common/Card';
import Badge from '../components/common/Badge';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import Dropdown from '../components/common/Dropdown';
import SearchInput from '../components/common/SearchInput';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function DesignSystemPreview({ currentRole, onRoleToggle }) {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form sample state
  const [formData, setFormData] = useState({
    name: 'Marcus Vance',
    email: 'marcus.v@visartech.demo',
    department: 'Engineering',
    role: 'Senior Full Stack Engineer',
    notes: 'Exemplary performance during Q3 deliverables.',
    search: '',
  });

  const departmentOptions = [
    { value: 'Engineering', label: 'Engineering' },
    { value: 'Design', label: 'Product & Design' },
    { value: 'Human Resources', label: 'Human Resources' },
    { value: 'Finance', label: 'Finance & Operations' },
  ];

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <PageHeader
        title="Design System & Component Library"
        subtitle="Reusable corporate UI kit for VISARTECH People. Inspired by Linear, Stripe, and enterprise design systems."
        badge={
          <Badge variant="info" size="md" dot>
            Phase 3 Ready
          </Badge>
        }
        breadcrumbs={[
          { label: 'VISARTECH People', href: '#' },
          { label: 'Design System', href: '#' },
          { label: 'Components Showcase' }
        ]}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={Download}
              onClick={() => alert('Component library documentation downloaded.')}
            >
              Export Tokens
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => setIsModalOpen(true)}
            >
              Test Modal Component
            </Button>
          </>
        }
      />

      {/* 1. Color Palette Tokens */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
            1. Brand Color Tokens
          </h2>
          <p className="text-xs text-brand-text-secondary">Precision hex values implemented across Tailwind design tokens.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { name: 'Navy (Primary)', hex: '#101B35', bg: 'bg-[#101B35]', text: 'text-white' },
            { name: 'Blue (Accent)', hex: '#356AE6', bg: 'bg-[#356AE6]', text: 'text-white' },
            { name: 'Background', hex: '#F5F7FB', bg: 'bg-[#F5F7FB] border border-slate-200', text: 'text-brand-navy' },
            { name: 'Surface', hex: '#FFFFFF', bg: 'bg-white border border-slate-200', text: 'text-brand-navy' },
            { name: 'Primary Text', hex: '#172033', bg: 'bg-[#172033]', text: 'text-white' },
            { name: 'Secondary Text', hex: '#718096', bg: 'bg-[#718096]', text: 'text-white' },
            { name: 'Border', hex: '#E5EAF2', bg: 'bg-[#E5EAF2]', text: 'text-brand-navy' },
            { name: 'Success', hex: '#16A36A', bg: 'bg-[#16A36A]', text: 'text-white' },
            { name: 'Warning', hex: '#E9A23B', bg: 'bg-[#E9A23B]', text: 'text-white' },
            { name: 'Danger', hex: '#DC5353', bg: 'bg-[#DC5353]', text: 'text-white' },
          ].map((c) => (
            <div key={c.hex} className="p-3 bg-white rounded-xl border border-brand-border shadow-subtle flex flex-col gap-2">
              <div className={`h-12 rounded-lg ${c.bg} flex items-center justify-center font-mono text-xs font-semibold ${c.text}`}>
                {c.hex}
              </div>
              <div>
                <p className="text-xs font-bold text-brand-navy truncate">{c.name}</p>
                <p className="text-[11px] font-mono text-slate-400">{c.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Stat Cards */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
            2. Stat Cards (Metrics &amp; KPIs)
          </h2>
          <p className="text-xs text-brand-text-secondary">Used in HR Admin &amp; Employee dashboards with trend badges and icons.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Workforce"
            value="6 Employees"
            icon={Users}
            iconColor="blue"
            trend="+12%"
            trendType="up"
            description="vs last quarter"
          />
          <StatCard
            title="Present Today"
            value="5 / 6"
            icon={Clock}
            iconColor="emerald"
            trend="83.3%"
            trendType="up"
            description="on-time check-in"
          />
          <StatCard
            title="Pending Leaves"
            value="2 Requests"
            icon={CalendarCheck}
            iconColor="amber"
            trend="Needs Review"
            trendType="neutral"
            description="1 Medical, 1 Annual"
          />
          <StatCard
            title="Monthly Payroll"
            value="$42,850"
            icon={BadgeDollarSign}
            iconColor="navy"
            trend="-2.4%"
            trendType="down"
            description="Nov Chicago cycle"
          />
        </div>
      </section>

      {/* 3. Buttons Showcase */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
            3. Buttons &amp; Interactive Variants
          </h2>
          <p className="text-xs text-brand-text-secondary">Support primary, secondary, outline, danger, loading, and icon configurations.</p>
        </div>

        <Card>
          <CardBody className="space-y-6">
            {/* Standard Variants */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Styles</p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline Button</Button>
                <Button variant="navy">Navy Corporate</Button>
                <Button variant="danger">Danger Action</Button>
                <Button variant="ghost">Ghost Button</Button>
              </div>
            </div>

            {/* Sizing & States */}
            <div className="pt-4 border-t border-brand-border">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Sizes &amp; States</p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button size="sm" leftIcon={Plus}>Small Icon</Button>
                <Button size="md" leftIcon={Briefcase} rightIcon={ArrowUpRight}>Medium Action</Button>
                <Button size="lg" leftIcon={Check}>Large Button</Button>
                <Button variant="primary" isLoading>Processing</Button>
                <Button variant="secondary" disabled>Disabled State</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* 4. Form Controls */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
            4. Form Inputs, Select, &amp; Textarea
          </h2>
          <p className="text-xs text-brand-text-secondary">Robust accessible controls with labels, icons, error handling, and helpers.</p>
        </div>

        <Card>
          <CardHeader action={<Badge variant="info">Live State</Badge>}>
            <CardTitle>Employee Profile Edit Demo</CardTitle>
            <CardDescription>Test form elements with real-time state manipulation.</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Elena Rostova"
                leftIcon={Users}
              />

              <Input
                label="Work Email"
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@visartech.demo"
                leftIcon={Mail}
                helperText="Must use fictional @visartech.demo domain."
              />

              <Select
                label="Assigned Department"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                options={departmentOptions}
              />

              <Input
                label="Restricted Field (With Error)"
                value="Invalid salary input"
                error="Salary modifications require HR Admin permissions."
                leftIcon={Lock}
                readOnly
              />

              <div className="md:col-span-2">
                <Textarea
                  label="Employee Notes & Performance Context"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Enter employee performance observation notes..."
                  rows={3}
                  helperText="Visible only to administrators and department managers."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-brand-text mb-1.5">
                  Search &amp; Filter Bar
                </label>
                <SearchInput
                  value={formData.search}
                  onChange={(e) => setFormData({ ...formData, search: e.target.value })}
                  onClear={() => setFormData({ ...formData, search: '' })}
                  placeholder="Quick search across 6 demo employees (Press '/' to focus)..."
                  shortcut="⌘F"
                />
              </div>
            </div>
          </CardBody>
          <CardFooter>
            <span className="text-xs text-slate-500">Forms automatically validate and sanitize before API dispatch.</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">Reset</Button>
              <Button variant="primary" size="sm" leftIcon={CheckCircle2}>Save Record</Button>
            </div>
          </CardFooter>
        </Card>
      </section>

      {/* 5. Badges, Avatars, & Spinners */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
            5. Badges, Avatars &amp; Status Indicators
          </h2>
          <p className="text-xs text-brand-text-secondary">Consistent visual feedback for roles, attendance status, and leave workflows.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Status Badges</CardTitle>
              <CardDescription>Variants with and without status indicator dots.</CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="success" dot>Approved</Badge>
                <Badge variant="pending" dot>Pending Approval</Badge>
                <Badge variant="warning" dot>Late Check-In</Badge>
                <Badge variant="rejected" dot>Rejected</Badge>
                <Badge variant="info" dot>On Leave</Badge>
                <Badge variant="navy" dot>HR Admin</Badge>
                <Badge variant="neutral">Draft</Badge>
              </div>

              <div className="flex flex-wrap gap-2 items-center pt-3 border-t border-brand-border">
                <Badge variant="success" size="sm">Active (sm)</Badge>
                <Badge variant="danger" size="sm">Terminated (sm)</Badge>
                <Badge variant="info" size="sm">Full-Time (sm)</Badge>
              </div>
            </CardBody>
          </Card>

          {/* Avatars */}
          <Card>
            <CardHeader>
              <CardTitle>Avatars &amp; Initials Fallback</CardTitle>
              <CardDescription>Deterministic initials generator with status indicators.</CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar name="Sarah Jenkins" size="xl" status="online" />
                <Avatar name="Alex Rivera" size="lg" status="away" />
                <Avatar name="David Chen" size="md" status="busy" />
                <Avatar name="Maya Patel" size="sm" status="offline" />
                <Avatar name="Liam Novak" size="xs" />
              </div>

              <div className="pt-3 border-t border-brand-border flex items-center justify-between">
                <span className="text-xs text-slate-500">Loading spinners:</span>
                <div className="flex items-center gap-3">
                  <LoadingSpinner size="sm" color="primary" />
                  <LoadingSpinner size="md" color="navy" />
                  <LoadingSpinner size="lg" color="slate" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* 6. Empty State Showcase */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
            6. Empty State Component
          </h2>
          <p className="text-xs text-brand-text-secondary">Friendly, clean fallback when lists, tables, or search queries return 0 items.</p>
        </div>

        <EmptyState
          icon={FolderOpen}
          title="No pending leave applications"
          description="All submitted leave requests for this pay period have been approved or resolved by the HR team."
          actionLabel="Submit Leave Request"
          actionIcon={Plus}
          onAction={() => alert('Action triggered: Open leave application modal')}
          secondaryAction={
            <Button variant="secondary" size="sm" onClick={() => alert('View archive clicked')}>
              View Leave History
            </Button>
          }
        />
      </section>

      {/* 7. Interactive Dropdown Demonstration */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-brand-navy flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
            7. Action Dropdowns
          </h2>
          <p className="text-xs text-brand-text-secondary">Clean menus with outside click dismissal, icons, and item categories.</p>
        </div>

        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-brand-navy">Employee Quick Actions</p>
              <p className="text-xs text-slate-500">Click the action menu to test trigger, placement, and keyboard support.</p>
            </div>

            <Dropdown
              align="right"
              trigger={
                <Button variant="secondary" size="sm" rightIcon={ArrowUpRight}>
                  Table Row Actions
                </Button>
              }
              items={[
                { label: 'View Employee Profile', icon: Users, onClick: () => alert('Viewing profile') },
                { label: 'Adjust Salary & Pay Grade', icon: BadgeDollarSign, onClick: () => alert('Opening payroll adjust') },
                { label: 'Export Attendance Report', icon: Clock, onClick: () => alert('Exporting report') },
                { type: 'separator' },
                { label: 'Deactivate Account', icon: Trash2, danger: true, onClick: () => alert('Account deactivated') },
              ]}
            />
          </CardBody>
        </Card>
      </section>

      {/* Modal Dialog Test Instance */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule New Employee Review"
        description="Configure quarterly KPI evaluation session for a team member."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Check}
              onClick={() => {
                alert('Review session scheduled successfully!');
                setIsModalOpen(false);
              }}
            >
              Confirm &amp; Schedule
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Selected Employee"
            value="Marcus Vance — Senior Engineer"
            readOnly
            leftIcon={Users}
          />
          <Select
            label="Review Type"
            options={[
              { value: 'q4_review', label: 'Q4 Performance Review' },
              { value: 'probation', label: 'Probation Completion Review' },
              { value: 'compensation', label: 'Annual Compensation Adjustment' },
            ]}
          />
          <Textarea
            label="Key Focus Areas"
            placeholder="Outline objectives, tech stack goals, and mentorship items..."
            rows={3}
          />
          <div className="p-3 bg-brand-blue-light rounded-xl border border-brand-blue/20 flex items-start gap-2 text-xs text-brand-navy">
            <Sparkles className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
            <span>Demonstrating Modal dialog with full escape key, backdrop dismissal, and focus management.</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
