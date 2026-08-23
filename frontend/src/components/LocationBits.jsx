import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, ChevronDown, Navigation, X } from 'lucide-react';
import { useLoc, LOCALITIES } from '@/context/LocationContext';

export const LocationPicker = () => {
  const { loc, requestGeo, setManual, status } = useLoc();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        data-testid="location-picker-btn"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm font-semibold text-foreground/80"
      >
        <MapPin className="h-4 w-4 text-primary" />
        <span className="max-w-[190px] truncate" data-testid="current-location-label">
          {loc ? loc.name : 'Set your location'}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="mx-auto max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 zz-rise"
            onClick={(e) => e.stopPropagation()}
            data-testid="location-sheet"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Choose your location</h3>
              <button onClick={() => setOpen(false)} data-testid="close-location-sheet">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <button
              data-testid="use-my-location-btn"
              onClick={() => {
                requestGeo();
                setOpen(false);
              }}
              className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-primary px-4 py-3.5 text-left text-primary-foreground"
            >
              <Navigation className="h-5 w-5" />
              <span>
                <span className="block text-sm font-bold">Use my current location</span>
                <span className="block text-xs opacity-80">
                  {status === 'denied' ? 'Permission blocked — pick a locality below' : 'Most accurate nearby results'}
                </span>
              </span>
            </button>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Or pick a locality
            </p>
            <div className="grid gap-2">
              {LOCALITIES.map((l) => (
                <button
                  key={l.name}
                  data-testid={`locality-${l.name.split(',')[0].toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => {
                    setManual(l);
                    setOpen(false);
                  }}
                  className="rounded-xl border border-border px-4 py-3 text-left text-sm font-semibold hover:border-primary hover:bg-secondary"
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export const RadiusChips = () => {
  const { radius, setRadius } = useLoc();
  return (
    <div className="flex gap-2" data-testid="radius-chips">
      {[1, 2, 5].map((r) => (
        <button
          key={r}
          data-testid={`radius-${r}km`}
          onClick={() => setRadius(r)}
          className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
            radius === r
              ? 'bg-primary text-primary-foreground zz-shadow'
              : 'border border-border bg-white text-foreground/70'
          }`}
        >
          {r} km
        </button>
      ))}
    </div>
  );
};
