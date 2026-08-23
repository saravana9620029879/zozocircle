import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Navigation } from 'lucide-react';
import * as Icons from 'lucide-react';
import { api } from '@/lib/api';
import { useLoc } from '@/context/LocationContext';
import { LocationPicker, RadiusChips } from '@/components/LocationBits';
import { ListingCardTile, ListingRow } from '@/components/ListingCard';

export default function HomePage() {
  const { loc, radius, requestGeo, status } = useLoc();
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');

  useEffect(() => {
    api.get('/categories').then((r) => setCats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loc) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get('/listings', { params: { lat: loc.lat, lng: loc.lng, radius_km: radius, category: cat, limit: 60 } })
      .then((r) => setItems(r.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [loc, radius, cat]);

  const products = items.filter((i) => i.type === 'product');
  const services = items.filter((i) => i.type === 'service');

  return (
    <div className="pb-28" data-testid="home-page">
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 px-4 pb-3 pt-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-extrabold tracking-tight text-primary font-display" data-testid="brand-name">
              ZOZOCIRCLE
            </p>
            <LocationPicker />
          </div>
          <button className="rounded-full border border-border p-2.5" data-testid="notif-btn">
            <Bell className="h-5 w-5 text-foreground/60" />
          </button>
        </div>
      </header>

      <div className="px-4 pt-5">
        <h1 className="text-3xl font-extrabold leading-tight font-display" data-testid="home-headline">
          What's near you?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Discover products &amp; services around you.</p>

        <button
          onClick={() => navigate('/explore')}
          data-testid="home-search-bar"
          className="mt-4 flex w-full items-center gap-2 rounded-2xl border border-border bg-secondary/60 px-4 py-3.5 text-left text-sm text-muted-foreground"
        >
          <Search className="h-4 w-4" />
          Search products or services...
        </button>

        <div className="mt-4">
          <RadiusChips />
        </div>

        <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4">
          <CatChip active={cat === 'all'} onClick={() => setCat('all')} icon="LayoutGrid" label="All" slug="all" />
          {cats.map((c) => (
            <CatChip
              key={c.slug}
              active={cat === c.slug}
              onClick={() => setCat(c.slug)}
              icon={c.icon}
              label={c.name}
              slug={c.slug}
            />
          ))}
        </div>
      </div>

      {!loc ? (
        <LocationGate onAllow={requestGeo} denied={status === 'denied'} />
      ) : loading ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground" data-testid="home-loading">
          Finding what's around you…
        </p>
      ) : items.length === 0 ? (
        <div className="px-4 py-14 text-center" data-testid="home-empty">
          <p className="text-base font-bold">Nothing within {radius} km yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a wider radius or another category.</p>
        </div>
      ) : (
        <>
          <Section title="Popular near you" onView={() => navigate('/explore?tab=product')} testid="popular-near-you">
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {products.slice(0, 10).map((l) => (
                <ListingCardTile key={l.id} listing={l} />
              ))}
              {products.length === 0 && <p className="text-sm text-muted-foreground">No products in this radius.</p>}
            </div>
          </Section>

          <Section title="Services near you" onView={() => navigate('/explore?tab=service')} testid="services-near-you">
            <div className="space-y-2.5">
              {services.slice(0, 6).map((l) => (
                <ListingRow key={l.id} listing={l} />
              ))}
              {services.length === 0 && <p className="text-sm text-muted-foreground">No services in this radius.</p>}
            </div>
          </Section>

          {products.slice(10).concat(services.slice(6)).length > 0 && (
            <Section title="More around you" testid="more-around-you">
              <div className="space-y-2.5">
                {products.slice(10).concat(services.slice(6)).map((l) => (
                  <ListingRow key={l.id} listing={l} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}    </div>
  );
}

const CatChip = ({ active, onClick, icon, label, slug }) => {
  const Icon = Icons[icon] || Icons.Tag;
  return (
    <button
      onClick={onClick}
      data-testid={`category-${slug}`}
      className="flex w-16 shrink-0 flex-col items-center gap-1.5"
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${
          active ? 'bg-primary text-primary-foreground zz-shadow' : 'bg-secondary text-primary'
        }`}
      >
        <Icon className="h-6 w-6" />
      </span>
      <span className={`text-[11px] font-semibold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
    </button>
  );
};

const Section = ({ title, onView, children, testid }) => (
  <section className="mt-7 px-4" data-testid={testid}>
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-lg font-bold font-display">{title}</h2>
      {onView && (
        <button onClick={onView} className="text-sm font-semibold text-primary" data-testid={`${testid}-view-all`}>
          View all
        </button>
      )}
    </div>
    {children}
  </section>
);

const LocationGate = ({ onAllow, denied }) => (
  <div className="mx-4 mt-8 rounded-3xl border border-border bg-secondary/50 p-6 text-center" data-testid="location-gate">
    <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
      <Navigation className="h-6 w-6" />
    </span>
    <h3 className="text-lg font-bold font-display">Share your location</h3>
    <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
      {denied
        ? 'Location permission was blocked. Pick your locality from the header to continue.'
        : 'We use it only to show products and services near you.'}
    </p>
    {!denied && (
      <button
        onClick={onAllow}
        data-testid="allow-location-btn"
        className="mt-4 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
      >
        Allow location
      </button>
    )}
  </div>
);
