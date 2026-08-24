import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiError } from '@/lib/api';
import { Input } from '@/pages/Auth';

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await adminLogin(email, password);
      toast.success('Admin signed in');
      navigate('/admin');
    } catch (e2) {
      setErr(apiError(e2));
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md px-6 pt-16" data-testid="admin-login-page">
      <p className="text-2xl font-extrabold text-primary font-display">ZOZOCIRCLE</p>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Lock className="h-3.5 w-3.5" /> Admin access
      </p>
      <h1 className="mt-8 text-3xl font-extrabold font-display">Admin login</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sellers and customers sign in with a mobile OTP instead.
      </p>
      <form onSubmit={submit} className="mt-7 space-y-3.5">
        <Input label="Email" type="email" testid="admin-email" value={email} onChange={setEmail} required />
        <Input label="Password" type="password" testid="admin-password" value={password} onChange={setPassword} required />
        {err && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive" data-testid="admin-login-error">
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          data-testid="admin-login-submit"
          className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Login as admin'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-semibold text-primary" data-testid="admin-to-otp-login">
          Login with mobile OTP instead
        </Link>
      </p>
    </div>
  );
}
