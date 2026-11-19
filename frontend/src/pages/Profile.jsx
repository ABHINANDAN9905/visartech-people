import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Briefcase, 
  Building2, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Award,
  Edit3,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardBody } from '../components/common/Card';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';

export default function Profile() {
  const { user } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profileData, setProfileData] = useState(() => {
    try {
      const stored = localStorage.getItem('visartech_profile_overrides');
      return stored
        ? JSON.parse(stored)
        : {
            phone: '+1 (312) 555-0194',
            location: 'Chicago, IL (Hybrid)',
            shift: '9:00 AM – 5:00 PM CST',
          };
    } catch {
      return {
        phone: '+1 (312) 555-0194',
        location: 'Chicago, IL (Hybrid)',
        shift: '9:00 AM – 5:00 PM CST',
      };
    }
  });

  const [editForm, setEditForm] = useState({ ...profileData });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setProfileData(editForm);
    localStorage.setItem('visartech_profile_overrides', JSON.stringify(editForm));
    setIsEditModalOpen(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile & Identity"
        subtitle="Manage your personal information, department designation, and company credentials."
        badge={
          <Badge variant={user?.role === 'HR_ADMIN' ? 'navy' : 'info'} size="md" dot>
            {user?.roleLabel || user?.role}
          </Badge>
        }
        breadcrumbs={[
          { label: 'VISARTECH People', href: '#' },
          { label: 'Account', href: '#' },
          { label: 'Profile' },
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={Edit3}
            onClick={() => {
              setEditForm({ ...profileData });
              setIsEditModalOpen(true);
            }}
          >
            Edit Contact Details
          </Button>
        }
      />

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile contact details updated successfully.</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name || 'Jordan Lee'} size="xl" status="online" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-brand-navy">{user?.name}</h2>
                <Badge variant="navy" size="sm" className="text-[10px]">
                  {user?.id || 'EMP-006'}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-brand-blue">{user?.title || 'Staff Member'}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-brand-border text-xs text-slate-600 font-medium">
              Timezone: <strong className="text-brand-navy">America/Chicago (CST)</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
            <CardDescription>Departmental and organizational attributes.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-brand-border/60">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" /> Department
              </span>
              <span className="font-bold text-brand-navy">{user?.department || 'Engineering'}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-brand-border/60">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" /> Employment Type
              </span>
              <Badge variant="success" size="sm">Full-Time Regular</Badge>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-brand-border/60">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" /> Start Date
              </span>
              <span className="font-mono text-brand-navy">January 15, 2024</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-400" /> System Role
              </span>
              <Badge variant="navy" size="sm">{user?.role}</Badge>
            </div>
          </CardBody>
        </Card>

        {/* Contact & Location Details */}
        <Card>
          <CardHeader>
            <CardTitle>Contact &amp; Workplace</CardTitle>
            <CardDescription>Emergency contact and office station information.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-brand-border/60">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" /> Work Location
              </span>
              <span className="font-bold text-brand-navy">{profileData.location}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-brand-border/60">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" /> Work Phone
              </span>
              <span className="font-mono text-brand-navy">{profileData.phone}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-brand-border/60">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Working Shift
              </span>
              <span className="text-brand-navy font-medium">{profileData.shift}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-400" /> Performance Rating
              </span>
              <span className="font-bold text-emerald-600">Exceeds Expectations (4.9 / 5.0)</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Contact & Workplace Details"
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <Input
            label="Work Phone Number"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            placeholder="+1 (312) 555-0194"
            required
          />

          <Input
            label="Work Location"
            value={editForm.location}
            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
            placeholder="Chicago, IL (Hybrid)"
            required
          />

          <Input
            label="Standard Working Shift"
            value={editForm.shift}
            onChange={(e) => setEditForm({ ...editForm, shift: e.target.value })}
            placeholder="9:00 AM – 5:00 PM CST"
            required
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
