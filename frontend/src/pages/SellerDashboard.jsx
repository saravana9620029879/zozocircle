import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Eye, MessageCircle, Star, Pencil, Trash2, Power, BadgeCheck, LogOut, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiError, money, imgUrl } from '@/lib/api';
import { shareOnWhatsApp, listingUrl } from '@/lib/share';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/context/AuthContext';

export default function SellerDashboard() {
  const { user, seller, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api
      .get('/seller/listings')
      .then((r) => setData(r.data))
      .catch((e) => toast.error(apiError(e)));
  }, []);

  useEffect(() => {
    if (user && seller) load();
  }, [user, seller, load]);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate('/login', { replace: true });
    else if (!seller) navigate('/seller/start', { replace: true });
  }, [loading, user, seller, navigate]);

  if (!user || !seller) return null;
  if (!data) return <p className="p-8 text-center text-sm text-muted-foreground">Loading dashboard…</p>;

  const { seller: s, listings } = data;
  const views = listings.reduce((a, l) => a + (l.views || 0), 0);
  const clicks = listings.reduce((a, l) => a + (l.whatsapp_clicks || 0), 0);
  const avg = listings.filter((l) => l.rating).length
    ? (listings.reduce((a, l) => a + (l.rating || 0), 0) / listings.filter((l) => l.rating).length).toFixed(1)
    : '—';

  const toggle = async (id) => {
    try {
      await api.patch(`/seller/listings/${id}/active`);
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  const del = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await api.delete(`/seller/listings/${id}`);
      toast.success('Listing deleted');
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-28" data-testid="seller-dashboard">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <h1 className="text-lg font-bold font-display">Dashboard</h1>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button
            data-testid="seller-logout"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            <LogOut className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="px-5 pt-5">
        <div className="rounded-3xl bg-primary p-5 text-primary-foreground">
          <p className="text-xl font-extrabold font-display" data-testid="seller-biz-name">
            {s.business_name}
          </p>
          <p className="text-sm opacity-80">
            Near {s.locality}, {s.city}
          </p>
          <span
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold capitalize"
            data-testid="seller-status-badge"
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            {s.verification_status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2.5">
          <Stat label="Listings" value={listings.length} testid="stat-listings" />
          <Stat label="Views" value={views} icon={Eye} testid="stat-views" />
          <Stat label="WA clicks" value={clicks} icon={MessageCircle} testid="stat-clicks" />
          <Stat label="Rating" value={avg} icon={Star} testid="stat-rating" />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-lg font-bold font-display">Your listings</h2>
          <Link
            to="/seller/listing/new"
            data-testid="add-listing-btn"
            className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Add new
          </Link>
        </div>

        <div className="mt-3 space-y-2.5">
          {listings.length === 0 && (
            <p className="rounded-2xl bg-secondary/50 p-5 text-center text-sm text-muted-foreground" data-testid="no-listings">
              No listings yet. Add your first product or service.
            </p>
          )}
          {listings.map((l) => (
            <div
              key={l.id}
              data-testid={`seller-listing-${l.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border p-3"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {l.images?.[0] && <img src={imgUrl(l.images[0])} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{l.name}</p>
                <p className="text-xs text-muted-foreground">
                  {money(l.price)} {l.unit ? `/ ${l.unit}` : ''} · {l.type}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge status={l.status} />
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      l.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {l.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {l.views || 0} views · {l.whatsapp_clicks || 0} WA
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <a
                  href={shareOnWhatsApp(l)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`share-listing-${l.id}`}
                  title="Share on WhatsApp"
                  onClick={(e) => {
                    if (l.status !== 'approved') {
                      e.preventDefault();
                      toast.error('Share once the listing is approved');
                    }
                  }}
                  className="rounded-lg border border-border p-1.5 text-[hsl(var(--wa))]"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </a>
                <Link
                  to={`/seller/listing/${l.id}`}
                  data-testid={`edit-listing-${l.id}`}
                  className="rounded-lg border border-border p-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <button
                  data-testid={`toggle-listing-${l.id}`}
                  onClick={() => toggle(l.id)}
                  className="rounded-lg border border-border p-1.5"
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
                <button
                  data-testid={`delete-listing-${l.id}`}
                  onClick={() => del(l.id)}
                  className="rounded-lg border border-border p-1.5 text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <Link
          to="/seller/profile"
          data-testid="edit-profile-link"
          className="mt-6 block rounded-2xl border border-border py-3.5 text-center text-sm font-bold"
        >
          Edit business profile
        </Link>
      </div>
    </div>
  );
}

const Stat = ({ label, value, icon: Icon, testid }) => (
  <div className="rounded-2xl border border-border p-3" data-testid={testid}>
    <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </p>
    <p className="mt-0.5 text-lg font-extrabold font-display">{value}</p>
  </div>
);

export const Badge = ({ status }) => {
  const map = {
    approved: 'bg-primary/10 text-primary',
    verified: 'bg-primary/10 text-primary',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
    suspended: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${map[status] || 'bg-muted'}`}>
      {status}
    </span>
  );
};
