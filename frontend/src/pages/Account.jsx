import { Link, useNavigate } from 'react-router-dom';
import { Store, LogOut, ShieldCheck, MapPin, ChevronRight, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLoc } from '@/context/LocationContext';
import { LocationPicker } from '@/components/LocationBits';

export default function AccountPage() {
  const { user, seller, logout } = useAuth();
  const { radius } = useLoc();
  const navigate = useNavigate();

  return (
    <div className="pb-28" data-testid="account-page">
      <header className="border-b border-border bg-primary px-5 pb-7 pt-7 text-primary-foreground">
        <p className="text-xs font-bold uppercase tracking-widest opacity-70">ZOZOCIRCLE</p>
        <h1 className="mt-1 text-2xl font-extrabold font-display" data-testid="account-name">
          {user ? user.name : 'Welcome'}
        </h1>
        <p className="text-sm opacity-80" data-testid="account-email">
          {user ? user.email : 'Your local circle.'}
        </p>
        {user && (
          <span className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold capitalize">
            {user.role}
          </span>
        )}
      </header>

      <div className="px-4 pt-5">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-semibold">Location &amp; radius ({radius} km)</span>
          </div>
          <LocationPicker />
        </div>

        {!user ? (
          <div className="space-y-2.5">
            <Link
              to="/login"
              data-testid="account-login-btn"
              className="block rounded-2xl bg-primary py-3.5 text-center text-sm font-bold text-primary-foreground"
            >
              Login with email OTP
            </Link>
            <p className="pt-1 text-center text-xs text-muted-foreground">
              New here? Just enter your email address — your account is created automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {user.role === 'admin' && (
              <Row to="/admin" icon={ShieldCheck} title="Admin dashboard" sub="Approvals, sellers, listings" testid="account-admin-link" />
            )}
            {seller ? (
              <Row to="/seller" icon={Store} title="Seller dashboard" sub={seller.business_name} testid="account-seller-link" />
            ) : (
              <Row to="/seller/start" icon={Store} title="List your business" sub="Start selling nearby" testid="account-list-business" />
            )}
            <Row to="/saved" icon={User} title="Saved listings" sub="Your favourites" testid="account-saved-link" />
            <button
              data-testid="logout-btn"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-border p-4 text-left"
            >
              <LogOut className="h-5 w-5 text-destructive" />
              <span className="text-sm font-bold text-destructive">Log out</span>
            </button>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">ZOZOCIRCLE · Your local circle.</p>
      </div>
    </div>
  );
}

const Row = ({ to, icon: Icon, title, sub, testid }) => (
  <Link to={to} data-testid={testid} className="flex items-center gap-3 rounded-2xl border border-border p-4">
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
      <Icon className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold">{title}</span>
      <span className="block truncate text-xs text-muted-foreground">{sub}</span>
    </span>
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
  </Link>
);
