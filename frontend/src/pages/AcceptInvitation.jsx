import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight,
  UserCheck,
  Check,
  X
} from 'lucide-react';
import { api, setStoredToken } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const checkToken = async () => {
      if (!token || !token.trim()) {
        setTokenError('Invitation token is missing from the link.');
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get(`/auth/invitation/${token.trim()}`);
        if (res.success && res.invitation) {
          setInvitationData(res.invitation);
        } else {
          setTokenError(res.message || 'Invitation link is invalid, expired, or has already been used.');
        }
      } catch (err) {
        setTokenError('Unable to connect to verification server. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
  }, [token]);

  // Password validation rules
  const passwordRules = [
    { label: 'At least 8 characters long', valid: password.length >= 8 },
    { label: 'Contains a number', valid: /\d/.test(password) },
    { label: 'Contains an uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'Contains a lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'Passwords match', valid: password.length > 0 && password === confirmPassword },
  ];

  const allRulesPassed = password.length >= 8 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.post('/auth/accept-invitation', {
        token: token.trim(),
        password,
      });

      if (res.success) {
        setIsSuccess(true);
        if (res.token) {
          setStoredToken(res.token);
        }
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      } else {
        setFormError(res.message || 'Failed to activate account. The invitation link may have expired.');
      }
    } catch (err) {
      setFormError(err.message || 'Network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col justify-between selection:bg-brand-blue selection:text-white">
      {/* Top Navigation / Brand */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-brand-border bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-navy flex items-center justify-center text-white font-black text-lg shadow-sm">
            V
          </div>
          <div>
            <span className="font-extrabold text-brand-navy tracking-tight text-base sm:text-lg">
              VISARTECH <span className="text-brand-blue">People</span>
            </span>
            <span className="hidden sm:inline-block text-[11px] text-brand-text-muted font-medium ml-2 pl-2 border-l border-brand-border">
              Enterprise HRMS
            </span>
          </div>
        </div>

        <Link
          to="/login"
          className="text-xs font-semibold text-brand-blue hover:text-brand-blue-hover hover:underline"
        >
          Return to Sign In
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-brand-border shadow-modal p-6 sm:p-8">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-10 space-y-3">
                <div className="w-10 h-10 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold text-brand-navy">Validating Invitation...</p>
                <p className="text-xs text-slate-500">Connecting securely to VISARTECH People directory.</p>
              </div>
            )}

            {/* Invalid or Expired Token State */}
            {!isLoading && tokenError && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-navy">Invitation Link Expired or Invalid</h2>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{tokenError}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-brand-navy">What should I do?</p>
                  <p className="text-[11px]">
                    Employee invitation links are single-use and expire after 48 hours for security. Please contact your HR Administrator to request a fresh invitation link.
                  </p>
                </div>
                <Button
                  variant="primary"
                  className="w-full mt-2"
                  onClick={() => navigate('/login')}
                  leftIcon={ArrowRight}
                >
                  Back to Sign In
                </Button>
              </div>
            )}

            {/* Success State */}
            {!isLoading && isSuccess && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-navy">Account Successfully Activated!</h2>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Your password has been saved and your profile is now ready.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 text-xs text-emerald-800">
                  <p className="font-medium">Redirecting you to the sign-in portal in a few seconds...</p>
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => navigate('/login')}
                  leftIcon={ArrowRight}
                >
                  Continue to Sign In Now
                </Button>
              </div>
            )}

            {/* Normal Invitation Password Setup Form */}
            {!isLoading && !tokenError && !isSuccess && invitationData && (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-blue/10 text-brand-blue border border-brand-blue/20 mb-3">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
                    Welcome, {invitationData.name}!
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Set up your secure password to complete your VISARTECH People account.
                  </p>
                </div>

                {/* Account Details Box */}
                <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-brand-border grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Employee ID</span>
                    <p className="font-mono font-bold text-brand-blue">{invitationData.employeeId}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Department</span>
                    <p className="font-medium text-brand-navy">{invitationData.department}</p>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Work Email</span>
                    <p className="font-medium text-slate-700 truncate">{invitationData.email}</p>
                  </div>
                </div>

                {formError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1.5">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create strong password"
                        leftIcon={Lock}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1.5">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        leftIcon={Lock}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Password Requirements:</p>
                    {passwordRules.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        {r.valid ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className={r.valid ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                          {r.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={isSubmitting || !allRulesPassed}
                    leftIcon={ShieldCheck}
                  >
                    {isSubmitting ? 'Activating Account...' : 'Set Password & Activate Account'}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-brand-border bg-white text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} VISARTECH People. All rights reserved &bull; Secure Employee Onboarding</p>
      </footer>
    </div>
  );
}
