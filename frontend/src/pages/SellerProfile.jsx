import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { LOCALITIES } from '@/context/LocationContext';
import { Input } from '@/pages/Auth';

export default function SellerProfile() {
  const { user, seller, refresh, loading } = useAuth();
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/categories').then((r) => setCats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (seller) {
      const { id, user_id, verification_status, created_at, ...rest } = seller;
      setF(rest);
    }
  }, [seller]);

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [loading, user, navigate]);

  if (!user) return null;
  if (!f) return <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/seller/profile', { ...f, service_radius_km: Number(f.service_radius_km) });
      await refresh();
      toast.success('Profile updated');
      navigate('/seller');
    } catch (e2) {
      toast.error(apiError(e2));
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-xl pb-28" data-testid="seller-profile-page">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-white/95 px-4 py-4 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} data-testid="profile-back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold font-display">Edit business profile</h1>
      </header>
      <form onSubmit={submit} className="space-y-4 px-5 pt-5">
        <Input label="Your name" testid="p-full-name" value={f.full_name} onChange={(v) => setF({ ...f, full_name: v })} required />
        <Input label="Business name" testid="p-business-name" value={f.business_name} onChange={(v) => setF({ ...f, business_name: v })} required />
        <Input label="Mobile number" testid="p-phone" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} required />
        <Input label="WhatsApp number" testid="p-whatsapp" value={f.whatsapp_number} onChange={(v) => setF({ ...f, whatsapp_number: v })} required />
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Business type</p>
          <select
            data-testid="p-biz-type"
            value={f.business_type}
            onChange={(e) => setF({ ...f, business_type: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm"
          >
            {['product', 'service', 'both'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Categories</p>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => {
              const on = (f.categories || []).includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  data-testid={`p-cat-${c.slug}`}
                  onClick={() =>
                    setF({
                      ...f,
                      categories: on
                        ? f.categories.filter((x) => x !== c.slug)
                        : [...(f.categories || []), c.slug],
                    })
                  }
                  className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${
                    on ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Description</p>
          <textarea
            data-testid="p-description"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-border px-3.5 py-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Locality</p>
          <select
            data-testid="p-locality"
            value={f.locality}
            onChange={(e) => {
              const l = LOCALITIES.find((x) => x.name.split(',')[0] === e.target.value);
              setF({ ...f, locality: e.target.value, lat: l?.lat ?? f.lat, lng: l?.lng ?? f.lng });
            }}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm"
          >
            {LOCALITIES.map((l) => (
              <option key={l.name} value={l.name.split(',')[0]}>
                {l.name}
              </option>
            ))}
            {!LOCALITIES.some((l) => l.name.split(',')[0] === f.locality) && (
              <option value={f.locality}>{f.locality}</option>
            )}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Service radius (km)" testid="p-radius" type="number" value={f.service_radius_km} onChange={(v) => setF({ ...f, service_radius_km: v })} />
          <Input label="Operating hours" testid="p-hours" value={f.operating_hours} onChange={(v) => setF({ ...f, operating_hours: v })} />
        </div>
        <button
          type="submit"
          disabled={busy}
          data-testid="save-profile-btn"
          className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
