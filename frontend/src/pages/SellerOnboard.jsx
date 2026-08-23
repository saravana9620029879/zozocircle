import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { LOCALITIES } from '@/context/LocationContext';
import { Input } from '@/pages/Auth';
import { ImageUploader } from '@/components/ImageUploader';

export default function SellerOnboard() {
  const { user, seller, refresh } = useAuth();
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState({
    full_name: '',
    business_name: '',
    phone: '',
    whatsapp_number: '',
    business_type: 'product',
    categories: [],
    description: '',
    locality: LOCALITIES[0].name.split(',')[0],
    city: 'Bengaluru',
    lat: LOCALITIES[0].lat,
    lng: LOCALITIES[0].lng,
    service_radius_km: 5,
    operating_hours: '9:00 AM - 8:00 PM',
    logo_url: null,
  });
  const [logo, setLogo] = useState([]);

  useEffect(() => {
    api.get('/categories').then((r) => setCats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user && !seller) setF((p) => ({ ...p, full_name: p.full_name || user.name }));
  }, [user, seller]);

  useEffect(() => {
    if (seller) navigate('/seller', { replace: true });
  }, [seller, navigate]);

  if (!user) {
    return (
      <Gate
        title="List your business on ZOZOCIRCLE"
        text="Create a free account to list your products or services and get discovered by nearby customers."
      />
    );
  }
  if (seller) return null;

  const useGps = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setF((p) => ({ ...p, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        toast.success('Location captured (kept private)');
      },
      () => toast.error('Could not get location — pick a locality instead')
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api.post('/seller/profile', { ...f, logo_url: logo[0] || null, categories: f.categories });
      await refresh();
      toast.success('Business submitted for review');
      navigate('/seller');
    } catch (e2) {
      setErr(apiError(e2));
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-xl pb-28" data-testid="seller-onboard-page">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-white/95 px-4 py-4 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} data-testid="onboard-back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold font-display">List Your Business</h1>
      </header>

      <form onSubmit={submit} className="space-y-4 px-5 pt-5">
        <div>
          <h2 className="text-xl font-extrabold font-display">Tell us about your business</h2>
          <p className="text-sm text-muted-foreground">This helps customers nearby discover you.</p>
        </div>

        <Input label="Your name" testid="seller-full-name" value={f.full_name} onChange={(v) => setF({ ...f, full_name: v })} required />
        <Input label="Business name" testid="seller-business-name" value={f.business_name} onChange={(v) => setF({ ...f, business_name: v })} required />

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Business type</p>
          <div className="flex gap-2">
            {['product', 'service', 'both'].map((t) => (
              <button
                key={t}
                type="button"
                data-testid={`biz-type-${t}`}
                onClick={() => setF({ ...f, business_type: t })}
                className={`flex-1 rounded-xl border py-3 text-sm font-bold capitalize ${
                  f.business_type === t ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Categories</p>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => {
              const on = f.categories.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  data-testid={`seller-cat-${c.slug}`}
                  onClick={() =>
                    setF({
                      ...f,
                      categories: on ? f.categories.filter((x) => x !== c.slug) : [...f.categories, c.slug],
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

        <Input label="Mobile number" testid="seller-phone" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} placeholder="+919876543210" required />
        <Input
          label="WhatsApp number"
          testid="seller-whatsapp"
          value={f.whatsapp_number}
          onChange={(v) => setF({ ...f, whatsapp_number: v })}
          placeholder="+919876543210"
          required
        />

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Description</p>
          <textarea
            data-testid="seller-description"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-border px-3.5 py-3 text-sm outline-none focus:border-primary"
            placeholder="What do you make or offer?"
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Location</p>
          <select
            data-testid="seller-locality"
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
          </select>
          <button
            type="button"
            data-testid="seller-use-gps"
            onClick={useGps}
            className="mt-2 flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <Navigation className="h-4 w-4" /> Use my exact location (kept private)
          </button>
          <p className="mt-1 text-xs text-muted-foreground">
            Your exact address is never shown publicly — customers only see approximate distance.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Service radius (km)"
            testid="seller-radius"
            type="number"
            value={f.service_radius_km}
            onChange={(v) => setF({ ...f, service_radius_km: Number(v) })}
          />
          <Input
            label="Operating hours"
            testid="seller-hours"
            value={f.operating_hours}
            onChange={(v) => setF({ ...f, operating_hours: v })}
          />
        </div>

        <ImageUploader images={logo} setImages={setLogo} max={1} testid="seller-logo-uploader" />

        {err && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive" data-testid="onboard-error">
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          data-testid="submit-seller-profile"
          className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </div>
  );
}

const Gate = ({ title, text }) => (
  <div className="mx-auto max-w-md px-6 pt-20 text-center" data-testid="seller-onboard-gate">
    <h1 className="text-2xl font-extrabold font-display">{title}</h1>
    <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    <Link
      to="/register"
      data-testid="onboard-register-link"
      className="mt-6 block rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
    >
      Create seller account
    </Link>
    <Link to="/login" data-testid="onboard-login-link" className="mt-3 block text-sm font-semibold text-primary">
      I already have an account
    </Link>
  </div>
);
