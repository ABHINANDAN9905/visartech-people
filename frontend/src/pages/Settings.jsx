import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Bell,
  Globe,
  Clock,
  User,
  CheckCircle2,
  Lock,
  Smartphone,
  Save,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody } from '../components/common/Card';

export default function SettingsPage() {
  const { user } = useAuth();

  const [preferences, setPreferences] = useState(() => {
    try {
      const stored = localStorage.getItem('visartech_user_preferences');
      return stored
        ? JSON.parse(stored)
        : {
            taskAlerts: true,
            announcementAlerts: true,
            leaveAlerts: true,
            payrollAlerts: true,
            feedbackAlerts: true,
            compactView: false,
          };
    } catch {
      return {
        taskAlerts: true,
        announcementAlerts: true,
        leaveAlerts: true,
        payrollAlerts: true,
        feedbackAlerts: true,
        compactView: false,
      };
    }
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggle = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    localStorage.setItem('visartech_user_preferences', JSON.stringify(preferences));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings & Preferences"
        subtitle="Configure organization parameters, timezone policies, in-app alert notifications, and role permissions."
        badge={<Badge variant="navy">System Core</Badge>}
        breadcrumbs={[
          { label: 'System', href: '#' },
          { label: 'Settings' }
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={Save}
            onClick={handleSave}
          >
            Save Preferences
          </Button>
        }
      />

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>System preferences and notification settings have been updated successfully.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Organization Config */}
        <Card>
          <CardHeader>
            <CardTitle>Organization &amp; Timezone</CardTitle>
            <CardDescription>Enterprise localization and operating parameters.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-brand-border">
              <div>
                <p className="font-bold text-brand-navy">Default System Timezone</p>
                <p className="text-slate-500">All shifts, attendance, and audit logs display in this zone.</p>
              </div>
              <Badge variant="info">America/Chicago (CST)</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-brand-border">
              <div>
                <p className="font-bold text-brand-navy">Storage Timestamp Standard</p>
                <p className="text-slate-500">Universal standard for future database timestamps.</p>
              </div>
              <Badge variant="navy">UTC ISO-8601</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-brand-border">
              <div>
                <p className="font-bold text-brand-navy">Company Legal Entity</p>
                <p className="text-slate-500">Registered corporate technology organization.</p>
              </div>
              <span className="font-semibold text-brand-navy">VISARTECH Solutions Inc.</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-brand-border">
              <div>
                <p className="font-bold text-brand-navy">Currency Locale</p>
                <p className="text-slate-500">Salary figures and compensation models format.</p>
              </div>
              <span className="font-semibold text-brand-navy">USD ($)</span>
            </div>
          </CardBody>
        </Card>

        {/* Demo Identity & Role Security */}
        <Card>
          <CardHeader>
            <CardTitle>Security &amp; Active Session</CardTitle>
            <CardDescription>Authentication parameters and simulated identity.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-brand-border">
              <div>
                <p className="font-bold text-brand-navy">Active Demo Identity</p>
                <p className="text-slate-500">Logged in account name and identifier.</p>
              </div>
              <span className="font-semibold text-brand-navy">
                {user?.name || 'Jordan Lee'} ({user?.role || 'EMPLOYEE'})
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-brand-border">
              <div>
                <p className="font-bold text-brand-navy">Role-Based Access Control</p>
                <p className="text-slate-500">Distinct routes for HR Admin vs Employee Self-Service.</p>
              </div>
              <Badge variant="success" dot>Enforced</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-brand-border">
              <div>
                <p className="font-bold text-brand-navy">Fictional Demo Guardrails</p>
                <p className="text-slate-500">Strictly fictional demo staff; no real data stored.</p>
              </div>
              <Badge variant="success">Compliant</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-brand-border">
              <div>
                <p className="font-bold text-brand-navy">Session Persistence</p>
                <p className="text-slate-500">Active credentials stored in browser sessionStorage.</p>
              </div>
              <Badge variant="info">Active</Badge>
            </div>
          </CardBody>
        </Card>

        {/* In-App Notification Preferences */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-blue" />
              <span>In-App Notification Preferences</span>
            </CardTitle>
            <CardDescription>
              Toggle which operational events trigger notifications in your activity center and navbar bell.
            </CardDescription>
          </CardHeader>
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {[
              {
                key: 'taskAlerts',
                title: 'Task Assignments & Updates',
                desc: 'Alerts when tasks are assigned, reviewed, or status changes.',
              },
              {
                key: 'announcementAlerts',
                title: 'Company Announcements',
                desc: 'Notices when executive bulletins or policy changes are published.',
              },
              {
                key: 'leaveAlerts',
                title: 'Leave Decisions & Requests',
                desc: 'Alerts for leave approvals, rejections, or pending applications.',
              },
              {
                key: 'payrollAlerts',
                title: 'Payroll & Payslip Notifications',
                desc: 'Notifications when monthly payroll is generated or disbursed.',
              },
              {
                key: 'feedbackAlerts',
                title: 'Employee Feedback Responses',
                desc: 'Alerts when HR responds to submitted feedback.',
              },
              {
                key: 'compactView',
                title: 'Compact Density Interface',
                desc: 'Reduces padding across data tables and register views.',
              },
            ].map((item) => (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key)}
                className="flex items-start justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition"
              >
                <div className="space-y-0.5 pr-2">
                  <p className="font-bold text-brand-navy">{item.title}</p>
                  <p className="text-slate-500 text-[11px] leading-relaxed">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences[item.key]}
                  onChange={() => {}}
                  className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue mt-0.5 cursor-pointer"
                />
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
