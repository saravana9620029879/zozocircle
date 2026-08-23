import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Share2, Star, MapPin, Clock, BadgeCheck, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api, imgUrl, money, distanceLabel, whatsappLink } from '@/lib/api';
import { useLoc } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loc } = useLoc();
  const { user } = useAuth();
  const [l, setL] = useState(null);
  const [saved, setSaved] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    api
      .get(`/listings/${id}`, { params: { lat: loc?.lat, lng: loc?.lng } })
      .then((r) => setL(r.data))
      .catch(() => toast.error('Listing not found'));
  }, [id, loc]);

  useEffect(() => {
    if (!user) return;
    api.get('/favorites').then((r) => setSaved(r.data.some((f) => f.id === id))).catch(() => {});
  }, [user, id]);

  const toggleSave = async () => {
    if (!user) {
      toast.error('Login to save listings');
      navigate('/login');
      return;
    }
    try {
      if (saved) {
        await api.delete(`/favorites/${id}`);
        setSaved(false);
        toast.success('Removed from Saved');
      } else {
        await api.post(`/favorites/${id}`);
        setSaved(true);
        toast.success('Saved');
      }
    } catch {
      toast.error('Could not update Saved');
    }
  };

  if (!l) return <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="pb-40" data-testid="listing-detail-page">
      <div className="relative">
        <div className="h-[300px] w-full overflow-hidden bg-secondary">
          {l.images?.[active] ? (
            <img src={imgUrl(l.images[active])} alt={l.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <IconBtn onClick={() => navigate(-1)} testid="detail-back-btn">
            <ChevronLeft className="h-5 w-5" />
          </IconBtn>
          <div className="flex gap-2">
            <IconBtn
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                toast.success('Link copied');
              }}
              testid="detail-share-btn"
            >
              <Share2 className="h-5 w-5" />
            </IconBtn>
            <IconBtn onClick={toggleSave} testid="detail-save-btn">
              <Heart className={`h-5 w-5 ${saved ? 'fill-red-500 text-red-500' : ''}`} />
            </IconBtn>
          </div>
        </div>
        {l.images?.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {l.images.map((_, i) => (
              <button
                key={i}
                data-testid={`detail-image-dot-${i}`}
                onClick={() => setActive(i)}
                className={`h-2 rounded-full transition-all ${i === active ? 'w-5 bg-white' : 'w-2 bg-white/60'}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-5 pt-5">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold capitalize text-secondary-foreground">
          {l.type}
        </span>
        <h1 className="mt-2.5 text-2xl font-extrabold leading-tight font-display" data-testid="detail-name">
          {l.name}
        </h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground" data-testid="detail-seller-name">
          By {l.seller.business_name}
          {l.seller.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1 font-bold" data-testid="detail-rating">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {l.rating || '—'} <span className="font-medium text-muted-foreground">({l.review_count} reviews)</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground" data-testid="detail-distance">
            <MapPin className="h-4 w-4" />
            {distanceLabel(l.distance_m) || `Near ${l.seller.locality}`}
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-foreground/80" data-testid="detail-description">
          {l.description}
        </p>

        <Divider />
        <Label>Price</Label>
        <p className="text-xl font-extrabold text-primary font-display" data-testid="detail-price">
          {l.type === 'service' ? 'From ' : ''}
          {money(l.price)}
          {l.unit ? <span className="text-base font-medium text-muted-foreground"> / {l.unit}</span> : null}
        </p>

        <Divider />
        <Label>Category</Label>
        <p className="text-sm font-semibold capitalize" data-testid="detail-category">
          {l.category}
        </p>

        {l.highlights?.length > 0 && (
          <>
            <Divider />
            <Label>Highlights</Label>
            <ul className="space-y-1.5" data-testid="detail-highlights">
              {l.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" strokeWidth={3} />
                  {h}
                </li>
              ))}
            </ul>
          </>
        )}

        <Divider />
        <Label>Availability</Label>
        <p className="text-sm font-semibold" data-testid="detail-availability">
          {l.availability}
        </p>

        <Divider />
        <Label>Seller information</Label>
        <div className="rounded-2xl border border-border p-4" data-testid="detail-seller-card">
          <p className="font-bold">{l.seller.business_name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{l.seller.description}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Near {l.seller.locality}, {l.seller.city}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {l.seller.operating_hours}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Exact address is kept private. Approximate distance is shown for your privacy and the seller's.
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
        <div className="mx-auto max-w-2xl">
          <a
            data-testid="whatsapp-cta"
            href={whatsappLink(l.whatsapp_number, l)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => api.post(`/listings/${id}/whatsapp-click`).catch(() => {})}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--wa))] py-4 text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
          >
            <MessageCircle className="h-5 w-5" />
            Order / Contact on WhatsApp
          </a>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">You will be redirected to WhatsApp</p>
        </div>
      </div>
    </div>
  );
}

const IconBtn = ({ children, onClick, testid }) => (
  <button
    onClick={onClick}
    data-testid={testid}
    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-foreground zz-shadow"
  >
    {children}
  </button>
);

const Divider = () => <div className="my-4 h-px bg-border" />;
const Label = ({ children }) => (
  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{children}</p>
);
