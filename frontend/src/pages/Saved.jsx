import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useLoc } from '@/context/LocationContext';
import { ListingRow } from '@/components/ListingCard';

export default function SavedPage() {
  const { user } = useAuth();
  const { loc } = useLoc();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    api
      .get('/favorites', { params: { lat: loc?.lat, lng: loc?.lng } })
      .then((r) => setItems(r.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user, loc]);

  return (
    <div className="pb-28" data-testid="saved-page">
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 px-4 py-4 backdrop-blur-xl">
        <h1 className="text-2xl font-extrabold font-display">Saved</h1>
        <p className="text-sm text-muted-foreground">Listings you want to come back to.</p>
      </header>
      <div className="space-y-2.5 px-4 pt-4">
        {!user ? (
          <Empty text="Login to save listings you like." cta />
        ) : loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <Empty text="Nothing saved yet. Tap the heart on any listing." />
        ) : (
          items.map((l) => <ListingRow key={l.id} listing={l} />)
        )}
      </div>
    </div>
  );
}

const Empty = ({ text, cta }) => (
  <div className="py-16 text-center" data-testid="saved-empty">
    <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
      <Heart className="h-6 w-6" />
    </span>
    <p className="text-sm text-muted-foreground">{text}</p>
    {cta && (
      <Link
        to="/login"
        data-testid="saved-login-link"
        className="mt-4 inline-block rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
      >
        Login
      </Link>
    )}
  </div>
);
