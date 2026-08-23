import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { apiError } from '@/lib/api';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const user = isLogin
        ? await login(form.email, form.password)
        : await register({ name: form.name, email: form.email, password: form.password, role: form.role });
      toast.success(isLogin ? 'Welcome back!' : 'Account created');
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'seller') navigate('/seller');
      else navigate('/');
    } catch (e2) {
      setErr(apiError(e2));
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md px-6 pb-16 pt-14" data-testid={`${mode}-page`}>
      <p className="text-2xl font-extrabold text-primary font-display">ZOZOCIRCLE</p>
      <p className="text-sm text-muted-foreground">Your local circle.</p>
      <h1 className="mt-8 text-3xl font-extrabold font-display">{isLogin ? 'Welcome back' : 'Create account'}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isLogin ? 'Login to save listings and manage your business.' : 'Join to discover and sell nearby.'}
      </p>

      <form onSubmit={submit} className="mt-7 space-y-3.5">
        {!isLogin && (
          <Input label="Full name" testid="auth-name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        )}
        <Input
          label="Email"
          type="email"
          testid="auth-email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          required
        />
        <Input
          label="Password"
          type="password"
          testid="auth-password"
          value={form.password}
          onChange={(v) => setForm({ ...form, password: v })}
          required
        />
        {!isLogin && (
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">I want to</p>
            <div className="flex gap-2">
              {[
                { k: 'customer', l: 'Buy nearby' },
                { k: 'seller', l: 'Sell nearby' },
              ].map((o) => (
                <button
                  key={o.k}
                  type="button"
                  data-testid={`role-${o.k}`}
                  onClick={() => setForm({ ...form, role: o.k })}
                  className={`flex-1 rounded-xl border py-3 text-sm font-bold ${
                    form.role === o.k ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        )}
        {err && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive" data-testid="auth-error">
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          data-testid="auth-submit"
          className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? 'Please wait…' : isLogin ? 'Login' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isLogin ? "Don't have an account? " : 'Already registered? '}
        <Link to={isLogin ? '/register' : '/login'} className="font-bold text-primary" data-testid="auth-switch">
          {isLogin ? 'Sign up' : 'Login'}
        </Link>
      </p>
      <p className="mt-4 text-center text-sm">
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
