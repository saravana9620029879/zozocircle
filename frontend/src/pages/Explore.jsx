import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useLoc } from '@/context/LocationContext';
import { LocationPicker, RadiusChips } from '@/components/LocationBits';
import { ListingRow } from '@/components/ListingCard';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'product', label: 'Products' },
  { key: 'service', label: 'Services' },
];

export default function ExplorePage() {
  const { loc, radius } = useLoc();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') || 'all');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [cats, setCats] = useState([]);
  const [sort, setSort] = useState('distance');
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    api.get('/categories').then((r) => setCats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api
        .get('/listings', {
          params: {
            lat: loc?.lat,
            lng: loc?.lng,
            radius_km: radius,
            type: tab === 'all' ? undefined : tab,
            category: cat,
            q: q || undefined,
            sort,
            min_rating: minRating || undefined,
            max_price: maxPrice || undefined,
          },
        })
        .then((r) => setItems(r.data))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [loc, radius, tab, cat, q, sort, minRating, maxPrice]);

  return (
    <div className="pb-28" data-testid="explore-page">
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 px-4 pb-3 pt-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold font-display">Explore</h1>
          <LocationPicker />
        </div>
        <div className="mt-3 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-secondary/50 px-3.5 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              data-testid="explore-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products or services..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {q && (
              <button onClick={() => setQ('')} data-testid="clear-search">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            data-testid="filters-btn"
            onClick={() => setShowFilters((v) => !v)}
            className={`rounded-2xl border px-3.5 ${showFilters ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              data-testid={`tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
                tab === t.key ? 'bg-primary text-primary-foreground' : 'border border-border bg-white text-foreground/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {showFilters && (
        <div className="space-y-4 border-b border-border bg-secondary/30 px-4 py-4" data-testid="filters-panel">
          <Field label="Distance">
            <RadiusChips />
          </Field>
          <Field label="Category">
            <select
              data-testid="filter-category"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
            >
              <option value="all">All categories</option>
              {cats.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max price (₹)">
              <input
                data-testid="filter-max-price"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Any"
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
              />
            </Field>
            <Field label="Min rating">
              <select
                data-testid="filter-rating"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
              >
                <option value={0}>Any</option>
                <option value={4}>4.0+</option>
                <option value={4.5}>4.5+</option>
                <option value={4.8}>4.8+</option>
              </select>
            </Field>
          </div>
          <Field label="Sort by">
            <select
              data-testid="filter-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
            >
              <option value="distance">Nearest first</option>
              <option value="rating">Top rated</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
            </select>
          </Field>
        </div>
      )}

      <div className="space-y-2.5 px-4 pt-4">
        {!loc && (
          <p className="rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground" data-testid="explore-no-location">
            Set your location from the header to see distances and nearby results.
          </p>
        )}
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground" data-testid="explore-loading">
            Searching…
          </p>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground" data-testid="explore-empty">
            No results found. Try a different search or a wider radius.
          </p>
        ) : (
          <>
            <p className="pb-1 text-xs font-semibold text-muted-foreground" data-testid="explore-result-count">
              {items.length} result{items.length === 1 ? '' : 's'}
              {loc ? ` within ${radius} km` : ' from all localities'}
            </p>
            {items.map((l) => (
              <ListingRow key={l.id} listing={l} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div>
    <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
    {children}
  </div>
);
