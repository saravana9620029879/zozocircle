import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Check, X, ShieldOff, BadgeCheck, Trash2, Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiError, money } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/pages/SellerDashboard';
import { AdminReviewSheet } from '@/components/AdminReviewSheet';
import { Input } from '@/pages/Auth';

const TABS = ['Overview', 'Sellers', 'Listings', 'Categories'];

export default function AdminDashboard() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [listings, setListings] = useState([]);
  const [cats, setCats] = useState([]);
  const [newCat, setNewCat] = useState({ name: '', slug: '', icon: 'Tag', applies_to: 'both' });
  const [review, setReview] = useState(null);

  const load = useCallback(async () => {
    try {
      const [a, b, c, d] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/sellers'),
        api.get('/admin/listings'),
        api.get('/admin/categories'),
      ]);
      setStats(a.data);
      setSellers(b.data);
      setListings(c.data);
      setCats(d.data);
    } catch (e) {
      toast.error(apiError(e));
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') load();
  }, [user, load]);

  if (loading) return <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!user || user.role !== 'admin') {
    return (
      <div className="px-6 pt-24 text-center" data-testid="admin-denied">
        <h1 className="text-xl font-extrabold font-display">Admin access required</h1>
        <button
          onClick={() => navigate('/admin-login')}
          data-testid="admin-login-redirect"
          className="mt-5 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Login as admin
        </button>
      </div>
    );
  }

  const sellerAction = async (id, status) => {
    try {
      await api.patch(`/admin/sellers/${id}/status?status=${status}`);
      toast.success(`Seller ${status}`);
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  const listingAction = async (id, status) => {
    try {
      await api.patch(`/admin/listings/${id}/status?status=${status}`);
      toast.success(`Listing ${status}`);
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  const delListing = async (id) => {
    if (!window.confirm('Delete listing permanently?')) return;
    try {
      await api.delete(`/admin/listings/${id}`);
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  const addCat = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/categories', newCat);
      setNewCat({ name: '', slug: '', icon: 'Tag', applies_to: 'both' });
      toast.success('Category added');
      load();
    } catch (e2) {
      toast.error(apiError(e2));
    }
  };
  const toggleCat = async (c) => {
    try {
      await api.put(`/admin/categories/${c.slug}`, { ...c, active: !c.active });
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="mx-auto max-w-4xl pb-28" data-testid="admin-dashboard">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">ZOZOCIRCLE</p>
          <h1 className="text-lg font-bold font-display">Admin Dashboard</h1>
        </div>
        <button
          data-testid="admin-logout"
          onClick={async () => {
            await logout();
            navigate('/');
          }}
        >
          <LogOut className="h-5 w-5 text-muted-foreground" />
        </button>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border px-5 py-3">
        {TABS.map((t) => (
          <button
            key={t}
            data-testid={`admin-tab-${t.toLowerCase()}`}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              tab === t ? 'bg-primary text-primary-foreground' : 'border border-border'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-5 pt-5">
        {tab === 'Overview' && stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="admin-stats">
            <Card label="Total sellers" value={stats.total_sellers} tid="stat-total-sellers" />
            <Card label="Total listings" value={stats.total_listings} tid="stat-total-listings" />
            <Card label="Active listings" value={stats.active_listings} tid="stat-active-listings" />
            <Card label="Pending listings" value={stats.pending_listings} tid="stat-pending-listings" />
            <Card label="Pending sellers" value={stats.pending_sellers} tid="stat-pending-sellers" />
            <Card label="WhatsApp clicks" value={stats.whatsapp_clicks} tid="stat-wa-clicks" />
          </div>
        )}

        {tab === 'Sellers' && (
          <div className="space-y-2.5" data-testid="admin-sellers-list">
            {sellers.map((s) => (
              <div key={s.id} data-testid={`admin-seller-${s.id}`} className="rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{s.business_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.full_name} · {s.locality}, {s.city} · {s.business_type}
                    </p>
                  </div>
                  <Badge status={s.verification_status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Act onClick={() => setReview({ kind: 'seller', data: s })} icon={Eye} label="Review" tid={`review-seller-${s.id}`} />
                  <Act onClick={() => sellerAction(s.id, 'approved')} icon={Check} label="Approve" tid={`approve-seller-${s.id}`} />
                  <Act onClick={() => sellerAction(s.id, 'verified')} icon={BadgeCheck} label="Verify" tid={`verify-seller-${s.id}`} />
                  <Act onClick={() => sellerAction(s.id, 'rejected')} icon={X} label="Reject" tid={`reject-seller-${s.id}`} danger />
                  <Act onClick={() => sellerAction(s.id, 'suspended')} icon={ShieldOff} label="Suspend" tid={`suspend-seller-${s.id}`} danger />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Listings' && (
          <div className="space-y-2.5" data-testid="admin-listings-list">
            {listings.map((l) => (
              <div key={l.id} data-testid={`admin-listing-${l.id}`} className="rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{l.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.seller_name} · {money(l.price)} {l.unit ? `/ ${l.unit}` : ''} · {l.type} · {l.category}
                    </p>
                  </div>
                  <Badge status={l.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Act onClick={() => setReview({ kind: 'listing', data: l })} icon={Eye} label="Review" tid={`review-listing-${l.id}`} />
                  <Act onClick={() => listingAction(l.id, 'approved')} icon={Check} label="Approve" tid={`approve-listing-${l.id}`} />
                  <Act onClick={() => listingAction(l.id, 'rejected')} icon={X} label="Reject" tid={`reject-listing-${l.id}`} danger />
                  <Act onClick={() => delListing(l.id)} icon={Trash2} label="Delete" tid={`admin-delete-listing-${l.id}`} danger />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Categories' && (
          <div data-testid="admin-categories">
            <form onSubmit={addCat} className="mb-5 space-y-3 rounded-2xl border border-border p-4">
              <p className="text-sm font-bold">Add category</p>
              <Input label="Name" testid="cat-name" value={newCat.name} onChange={(v) => setNewCat({ ...newCat, name: v })} required />
              <Input label="Slug" testid="cat-slug" value={newCat.slug} onChange={(v) => setNewCat({ ...newCat, slug: v })} required />
              <Input label="Lucide icon name" testid="cat-icon" value={newCat.icon} onChange={(v) => setNewCat({ ...newCat, icon: v })} />
              <button
                type="submit"
                data-testid="add-category-btn"
                className="flex w-full items-center justify-center gap-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </form>
            <div className="space-y-2">
              {cats.map((c) => (
                <div
                  key={c.slug}
                  data-testid={`admin-category-${c.slug}`}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                >
                  <span className="text-sm font-semibold">
                    {c.name} <span className="text-xs text-muted-foreground">({c.slug})</span>
                  </span>
                  <button
                    data-testid={`toggle-category-${c.slug}`}
                    onClick={() => toggleCat(c)}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      c.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {c.active ? 'Active' : 'Disabled'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AdminReviewSheet
        review={review}
        onClose={() => setReview(null)}
        onApprove={async () => {
          if (review.kind === 'seller') await sellerAction(review.data.id, 'approved');
          else await listingAction(review.data.id, 'approved');
          setReview(null);
        }}
        onReject={async () => {
          if (review.kind === 'seller') await sellerAction(review.data.id, 'rejected');
          else await listingAction(review.data.id, 'rejected');
          setReview(null);
        }}
        onVerify={async () => {
          await sellerAction(review.data.id, 'verified');
          setReview(null);
        }}
      />
    </div>
  );
}

const Card = ({ label, value, tid }) => (
  <div className="rounded-2xl border border-border p-4" data-testid={tid}>
    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-extrabold font-display">{value}</p>
  </div>
);

const Act = ({ onClick, icon: Icon, label, tid, danger }) => (
  <button
    onClick={onClick}
    data-testid={tid}
    className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${
      danger ? 'border-destructive/30 text-destructive' : 'border-primary/30 text-primary'
    }`}
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
  </button>
);
