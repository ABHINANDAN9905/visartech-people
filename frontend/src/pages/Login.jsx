import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  UserCheck, 
  AlertCircle, 
  Sparkles,
  Info,
  CheckCircle2,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';

export default function Login() {
  const { login, loginAsRole, isAuthenticated, demoAccounts, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const origin = location.state?.from?.pathname || '/dashboard';
      navigate(origin, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your work email address or Employee ID.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    const result = await login(identifier, password);
    if (!result.success) {
      setErrorMessage(result.message);
    } else {
      const origin = location.state?.from?.pathname || '/dashboard';
      navigate(origin, { replace: true });
    }
  };

  const handleDemoLogin = async (roleKey) => {
    setErrorMessage('');
    const account = demoAccounts[roleKey];
    if (account) {
      setIdentifier(account.email);
      setPassword(account.password);
      const result = await loginAsRole(roleKey);
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMessage(result.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col justify-between selection:bg-[#356AE6] selection:text-white">
      {/* Top Navbar Header */}
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

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-blue-light text-brand-blue border border-brand-blue/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Frontend Demo Mode</span>
          </span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-brand-border shadow-modal p-6 sm:p-8">
            {/* Title & Subtitle */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-blue/10 text-brand-blue border border-brand-blue/20 mb-3 shadow-subtle">
                <Building2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
                Sign in to VISARTECH
              </h1>
              <p className="text-xs text-brand-text-secondary mt-1">
                Enter your credentials to access your HR portal and employee workspace.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-xl bg-brand-danger-light border border-brand-danger/30 text-brand-danger flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-text mb-1.5">
                  Email Address or Employee ID <span className="text-brand-danger">*</span>
                </label>
                <Input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@visartech.demo or EMP-001"
                  leftIcon={User}
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-brand-text">
                    Password <span className="text-brand-danger">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-xs font-semibold text-brand-blue hover:text-brand-blue-hover hover:underline focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    leftIcon={Lock}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                  />
                  <span>Remember me on this device</span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2 font-bold shadow-md"
                isLoading={isLoading}
                rightIcon={ArrowRight}
              >
                Sign In to Platform
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                <span className="bg-white px-3 text-slate-400">
                  Instant Demo Access
                </span>
              </div>
            </div>

            {/* 1-Click Demo Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleDemoLogin('HR_ADMIN')}
                disabled={isLoading}
                className="w-full p-3 rounded-xl border border-brand-border bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-left flex items-center justify-between group focus:outline-none focus:ring-2 focus:ring-brand-navy"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-navy text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-brand-navy leading-none">
                        Continue as HR Admin
                      </p>
                      <Badge variant="navy" size="sm" className="text-[9px] py-0 px-1">
                        FULL ACCESS
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 leading-none">
                      kumarabhinandan1307@gmail.com
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-navy group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('EMPLOYEE')}
                disabled={isLoading}
                className="w-full p-3 rounded-xl border border-brand-border bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-left flex items-center justify-between group focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-brand-navy leading-none">
                        Continue as Employee
                      </p>
                      <Badge variant="info" size="sm" className="text-[9px] py-0 px-1">
                        STAFF PORTAL
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 leading-none">
                      employee1@visartech.demo
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            {/* Demo Mode Notice */}
            <div className="mt-6 pt-4 border-t border-brand-border/80 text-center">
              <p className="text-[11px] text-slate-500 font-medium">
                Demo Mode &mdash; Sample accounts and fictional employee data.
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Full JWT/bcrypt backend authentication is connected in subsequent phases.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Demo Notice Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Demo Password Recovery"
        description="Password reset behavior in VISARTECH People demonstration mode."
        footer={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsForgotModalOpen(false)}
          >
            Understood, Return to Sign In
          </Button>
        }
      >
        <div className="space-y-3 text-xs text-brand-text">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Self-Service Reset Disabled in Demo</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Because this demonstration runs with sandboxed fictional accounts, email transmission and external token generation are disabled.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <p className="font-bold text-brand-navy">Pre-configured Demo Credentials:</p>
            <p className="font-mono text-[11px] text-slate-600">
              &bull; <strong>HR Admin:</strong> kumarabhinandan1307@gmail.com &bull; Password: <code className="bg-white px-1 py-0.5 rounded border border-slate-200">Admin@123</code>
            </p>
            <p className="font-mono text-[11px] text-slate-600">
              &bull; <strong>Employee:</strong> employee1@visartech.demo &bull; Password: <code className="bg-white px-1 py-0.5 rounded border border-slate-200">Employee@123</code>
            </p>
          </div>
        </div>
      </Modal>

      {/* Footer */}
      <footer className="py-4 border-t border-brand-border bg-white text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} VISARTECH People. All rights reserved &bull; Fictional Demo System</p>
      </footer>
    </div>
  );
}
