import { useMemo, useState } from 'react';
import { Search, Navigation, Check, MapPin, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { LOCALITIES } from '@/context/LocationContext';

const nearestLocality = (lat, lng) => {
  let best = LOCALITIES[0];
  let bestD = Infinity;
  for (const l of LOCALITIES) {
    const d = (l.lat - lat) ** 2 + (l.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = l;
    }
  }
  return best;
};

export const LocalitySelect = ({ value, onChange }) => {
  const [q, setQ] = useState('');
  const [gps, setGps] = useState(false);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? LOCALITIES.filter((l) => l.name.toLowerCase().includes(term)) : LOCALITIES;
  }, [q]);

  const pick = (l) => {
    setGps(false);
    onChange({ locality: l.name.split(',')[0], lat: l.lat, lng: l.lng });
  };

  const useGps = () => {
    if (!navigator.geolocation) {
      toast.error('Location not supported — search for your locality instead');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const near = nearestLocality(latitude, longitude);
        setGps(true);
        onChange({ locality: near.name.split(',')[0], lat: latitude, lng: longitude });
        toast.success('Location captured — your exact address stays private');
      },
      () => toast.error('Could not get your location — search for your locality instead')
    );
  };

  return (
    <div data-testid="locality-select">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Location</p>

      <div
        className="mb-3 flex items-start gap-2.5 rounded-2xl border border-primary/30 bg-secondary/60 p-3.5"
        data-testid="selected-locality-banner"
      >
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Selected locality</p>
          <p className="truncate text-sm font-bold" data-testid="selected-locality-name">
            {value.locality}, Bengaluru
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground" data-testid="selected-locality-source">
            {gps ? 'Pinned from your current location' : 'Chosen from the locality list'}
          </p>
        </div>
      </div>

      <button
        type="button"
        data-testid="seller-use-gps"
        onClick={useGps}
        className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-left text-primary-foreground"
      >
        <Navigation className="h-5 w-5 shrink-0" />
        <span>
          <span className="block text-sm font-bold">Use my current location</span>
          <span className="block text-[11px] opacity-80">Most accurate distance for nearby customers</span>
        </span>
      </button>

      <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          data-testid="locality-search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your locality..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl" data-testid="locality-options">
        {results.length === 0 ? (
          <p className="px-1 py-3 text-sm text-muted-foreground" data-testid="locality-no-results">
            No locality matches “{q}”. Try another name or use your current location.
          </p>
        ) : (
          results.map((l) => {
            const on = value.locality === l.name.split(',')[0];
            return (
              <button
                key={l.name}
                type="button"
                data-testid={`seller-locality-${l.name.split(',')[0].toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => pick(l)}
                className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
                  on ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40'
                }`}
              >
                {l.name}
                {on && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
              </button>
            );
          })
        )}
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Your exact address is never shown publicly — customers only see your locality and an approximate distance.
      </p>
    </div>
  );
};
