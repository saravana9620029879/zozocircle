import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiError } from '@/lib/api';

export default function AuthPage() {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('customer');
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  const send = async (e) => {
    e?.preventDefault();
    setErr('');
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, '').slice(-10)) || phone.replace(/\D/g, '').length < 10) {
      setErr('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setBusy(true);
    try {
      const d = await requestOtp(phone, name);
      setStep('otp');
      setOtp('');
      setCooldown(d.resend_in || 30);
      toast.success(`OTP sent to +91 ${d.phone}`);
    } catch (e2) {
      setErr(apiError(e2));
    }
    setBusy(false);
  };

  const verify = async (e) => {
    e?.preventDefault();
    setErr('');
    if (otp.length !== 6) {
      setErr('Enter the 6-digit OTP');
      return;
    }
    setBusy(true);
    try {
      const d = await verifyOtp({ phone, otp, name, role });
      toast.success(d.is_new_user ? 'Welcome to ZOZOCIRCLE!' : 'Welcome back!');
      if (d.user.role === 'seller') navigate(d.has_seller_profile ? '/seller' : '/seller/start');
      else if (d.is_new_user && role === 'seller') navigate('/seller/start');
      else navigate('/');
    } catch (e2) {
      setErr(apiError(e2));
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md px-6 pb-16 pt-14" data-testid="login-page">
      {step === 'otp' && (
        <button
          onClick={() => {
            setStep('phone');
            setErr('');
          }}
          data-testid="change-number-btn"
          className="mb-4 flex items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Change number
        </button>
      )}

      <p className="text-2xl font-extrabold text-primary font-display">ZOZOCIRCLE</p>
      <p className="text-sm text-muted-foreground">Your local circle.</p>

      {step === 'phone' ? (
        <form onSubmit={send} className="mt-8" data-testid="phone-step">
          <h1 className="text-3xl font-extrabold font-display">Login or sign up</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We'll send a 6-digit OTP to your mobile number. No password needed.
          </p>

          <p className="mb-1.5 mt-7 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Mobile number
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-3 focus-within:border-primary">
            <span className="text-sm font-bold text-muted-foreground">+91</span>
            <input
              data-testid="phone-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="98765 43210"
              className="w-full bg-transparent text-sm outline-none"
              required
            />
          </div>

          <p className="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Your name <span className="font-medium normal-case">(new users only)</span>
          </p>
          <input
            data-testid="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya Sharma"
            className="w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-primary"
          />

          <p className="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            I want to
          </p>
          <div className="flex gap-2">
            {[
              { k: 'customer', l: 'Buy nearby' },
              { k: 'seller', l: 'Sell nearby' },
            ].map((o) => (
              <button
                key={o.k}
                type="button"
                data-testid={`role-${o.k}`}
                onClick={() => setRole(o.k)}
                className={`flex-1 rounded-xl border py-3 text-sm font-bold ${
                  role === o.k ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Existing accounts keep their current role and listings.
          </p>

          {err && (
            <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive" data-testid="auth-error">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            data-testid="send-otp-btn"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'Sending OTP…' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-8" data-testid="otp-step">
          <h1 className="text-3xl font-extrabold font-display">Enter OTP</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sent to <span className="font-bold text-foreground">+91 {phone}</span>
          </p>

          <input
            ref={otpRef}
            data-testid="otp-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            className="mt-7 w-full rounded-xl border border-border bg-white px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-primary"
          />

          {err && (
            <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive" data-testid="auth-error">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            data-testid="verify-otp-btn"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'Verifying…' : 'Verify & continue'}
          </button>

          <button
            type="button"
            disabled={cooldown > 0 || busy}
            data-testid="resend-otp-btn"
            onClick={send}
            className="mt-4 w-full text-sm font-bold text-primary disabled:text-muted-foreground"
          >
            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
          </button>

          <p className="mt-6 flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Your OTP expires in a few minutes and can only be tried a limited number of times.
          </p>
        </form>
      )}

      <p className="mt-8 text-center text-sm">
        <Link to="/" className="font-semibold text-muted-foreground" data-testid="auth-back-home">
          ← Back to browsing
        </Link>
      </p>
    </div>
  );
}

export const Input = ({ label, testid, value, onChange, type = 'text', required, placeholder, ...rest }) => (
  <div>
    <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
    <input
      data-testid={testid}
      type={type}
      value={value}
      required={required}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-primary"
      {...rest}
    />
  </div>
);
