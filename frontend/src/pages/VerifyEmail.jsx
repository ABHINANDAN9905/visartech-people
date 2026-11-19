import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Mail,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/apiClient';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState({ loading: false, message: '', error: false });

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided in URL. Please check your verification link.');
      return;
    }

    let isMounted = true;

    async function executeVerification() {
      try {
        const res = await api.get(`/auth/verify-email/${token}`);

        if (!isMounted) return;

        if (res.success) {
          setStatus('success');
          setMessage(res.message || 'Your email address has been successfully verified.');
          if (res.user?.email) {
            setVerifiedEmail(res.user.email);
          }
        } else {
          setStatus('error');
          setMessage(res.message || 'Verification link is invalid, expired, or has already been used.');
        }
      } catch (err) {
        if (!isMounted) return;
        setStatus('error');
        setMessage(err.message || 'Network error encountered during email verification.');
      }
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendStatus({ loading: true, message: '', error: false });
    try {
      const res = await api.post('/auth/resend-verification', {
        email: resendEmail.trim().toLowerCase(),
      });

      if (res.success) {
        setResendStatus({
          loading: false,
          message: 'Verification link sent! Please check your inbox.',
          error: false,
        });
      } else {
        setResendStatus({
          loading: false,
          message: res.message || 'Failed to send verification link.',
          error: true,
        });
      }
    } catch (err) {
      setResendStatus({
        loading: false,
        message: err.message || 'Network error. Please try again.',
        error: true,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col justify-between selection:bg-[#356AE6] selection:text-white">
      {/* Header */}
      <header className="h-16 border-b border-brand-border bg-white px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-blue flex items-center justify-center shadow-md">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-brand-navy">
                VISARTECH
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                People
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-none">
              One Platform. Every People Operation.
            </p>
          </div>
        </div>

        <Link
          to="/login"
          className="text-xs font-semibold text-brand-blue hover:text-brand-blue-hover hover:underline"
        >
          Sign In
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-brand-border shadow-modal p-6 sm:p-8 text-center">
            {/* 1. Loading State */}
            {status === 'loading' && (
              <div className="py-8">
                <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center mx-auto mb-4 animate-spin">
                  <Loader2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-extrabold text-brand-navy tracking-tight mb-2">
                  Verifying Email Address
                </h2>
                <p className="text-xs text-brand-text-secondary max-w-sm mx-auto">
                  Connecting to the VISARTECH People verification server to validate your one-time token...
                </p>
              </div>
            )}

            {/* 2. Success State */}
            {status === 'success' && (
              <div className="py-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm animate-in zoom-in-95 duration-200">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wide uppercase mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Identity
                </div>

                <h2 className="text-2xl font-extrabold text-brand-navy tracking-tight mb-2">
                  Email Verified!
                </h2>

                <p className="text-xs text-brand-text-secondary max-w-sm mx-auto mb-6 leading-relaxed">
                  {message}
                  {verifiedEmail && (
                    <span className="block font-semibold text-brand-navy mt-1">
                      {verifiedEmail}
                    </span>
                  )}
                </p>

                <Button
                  variant="primary"
                  size="md"
                  className="w-full font-bold shadow-md"
                  onClick={() => navigate('/login')}
                  rightIcon={ArrowRight}
                >
                  Proceed to Sign In
                </Button>
              </div>
            )}

            {/* 3. Error State */}
            {status === 'error' && (
              <div className="py-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-sm animate-in zoom-in-95 duration-200">
                  <AlertCircle className="w-9 h-9" />
                </div>

                <h2 className="text-xl font-extrabold text-brand-navy tracking-tight mb-2">
                  Verification Failed
                </h2>

                <p className="text-xs text-rose-600 font-medium max-w-sm mx-auto mb-6 leading-relaxed">
                  {message}
                </p>

                {/* Resend Link Card */}
                <div className="border border-brand-border rounded-xl p-4 bg-slate-50 text-left mb-6">
                  <p className="text-xs font-bold text-brand-navy mb-1 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-brand-blue" />
                    Request a New Verification Link
                  </p>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Tokens expire after 24 hours. Enter your email to generate a fresh link:
                  </p>

                  <form onSubmit={handleResend} className="space-y-3">
                    <Input
                      type="email"
                      placeholder="Enter your registered email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      leftIcon={Mail}
                      required
                    />

                    {resendStatus.message && (
                      <p
                        className={`text-[11px] font-medium ${
                          resendStatus.error ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {resendStatus.message}
                      </p>
                    )}

                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      className="w-full font-semibold"
                      isLoading={resendStatus.loading}
                    >
                      Resend Verification Link
                    </Button>
                  </form>
                </div>

                <Link
                  to="/login"
                  className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-brand-navy"
                >
                  Return to Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-brand-border bg-white text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} VISARTECH People. All rights reserved.</p>
      </footer>
    </div>
  );
}
