import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/pages/Auth';
import { ImageUploader } from '@/components/ImageUploader';

export default function AddListing() {
  const { id } = useParams();
  const editing = id && id !== 'new';
  const navigate = useNavigate();
  const { user, seller, loading } = useAuth();
  const [cats, setCats] = useState([]);
  const [images, setImages] = useState([]);
  const [hl, setHl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState({
    type: 'product',
    name: '',
    category: 'food',
    description: '',
    price: '',
    unit: '',
    availability: 'Available',
    highlights: [],
  });

  useEffect(() => {
    api.get('/categories').then((r) => setCats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editing) return;
    api.get('/seller/listings').then((r) => {
      const l = r.data.listings.find((x) => x.id === id);
      if (!l) return;
      setF({
        type: l.type,
        name: l.name,
        category: l.category,
        description: l.description || '',
        price: l.price,
        unit: l.unit || '',
        availability: l.availability || 'Available',
        highlights: l.highlights || [],
      });
      setImages(l.images || []);
    });
  }, [editing, id]);

  useEffect(() => {
    if (!loading && (!user || !seller)) navigate('/seller/start', { replace: true });
  }, [loading, user, seller, navigate]);

  if (!user || !seller) return null;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const payload = { ...f, price: Number(f.price), images };
    try {
      if (editing) await api.put(`/seller/listings/${id}`, payload);
      else await api.post('/seller/listings', payload);
      toast.success(editing ? 'Listing updated — sent for review' : 'Listing submitted for review');
      navigate('/seller');
    } catch (e2) {
      setErr(apiError(e2));
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-xl pb-28" data-testid="add-listing-page">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-white/95 px-4 py-4 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} data-testid="listing-form-back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold font-display">{editing ? 'Edit listing' : 'Add Product / Service'}</h1>
      </header>

      <form onSubmit={submit} className="space-y-4 px-5 pt-5">
        <ImageUploader images={images} setImages={setImages} max={5} />

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Type</p>
          <div className="flex gap-2">
            {['product', 'service'].map((t) => (
              <button
                key={t}
                type="button"
                data-testid={`listing-type-${t}`}
                onClick={() => setF({ ...f, type: t })}
                className={`flex-1 rounded-xl border py-3 text-sm font-bold capitalize ${
                  f.type === t ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Item name"
          testid="listing-name"
          value={f.name}
          onChange={(v) => setF({ ...f, name: v })}
          placeholder="Homemade Mango Pickle"
          required
        />

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Category</p>
          <select
            data-testid="listing-category"
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
            className="w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm"
          >
            {cats.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Description</p>
          <textarea
            data-testid="listing-description"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-border px-3.5 py-3 text-sm outline-none focus:border-primary"
            placeholder="Traditional homemade mango pickle made in small batches."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={f.type === 'service' ? 'Starting price (₹)' : 'Price (₹)'}
            testid="listing-price"
            type="number"
            value={f.price}
            onChange={(v) => setF({ ...f, price: v })}
            placeholder="180"
            required
          />
          <Input
            label="Unit"
            testid="listing-unit"
            value={f.unit}
            onChange={(v) => setF({ ...f, unit: v })}
            placeholder={f.type === 'service' ? 'per session' : '300g'}
          />
        </div>

        <Input
          label="Availability"
          testid="listing-availability"
          value={f.availability}
          onChange={(v) => setF({ ...f, availability: v })}
          placeholder="Available / Made to order"
        />

        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Highlights (optional)
          </p>
          <div className="flex gap-2">
            <input
              data-testid="highlight-input"
              value={hl}
              onChange={(e) => setHl(e.target.value)}
              placeholder="100% Homemade"
              className="flex-1 rounded-xl border border-border px-3.5 py-3 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              data-testid="add-highlight-btn"
              onClick={() => {
                if (!hl.trim()) return;
                setF({ ...f, highlights: [...f.highlights, hl.trim()] });
                setHl('');
              }}
              className="rounded-xl bg-primary px-4 text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {f.highlights.map((h) => (
              <span key={h} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
                {h}
                <button type="button" onClick={() => setF({ ...f, highlights: f.highlights.filter((x) => x !== h) })}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {err && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive" data-testid="listing-error">
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          data-testid="save-listing-btn"
          className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save & Publish'}
        </button>
        <p className="pb-4 text-center text-xs text-muted-foreground">
          New and edited listings go live after admin approval.
        </p>
      </form>
    </div>
  );
}
