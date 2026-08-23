import { useNavigate } from 'react-router-dom';
import { Star, MapPin, BadgeCheck } from 'lucide-react';
import { imgUrl, money, distanceLabel } from '@/lib/api';

const Fallback = ({ className }) => (
  <div className={`flex items-center justify-center bg-secondary text-primary/40 ${className}`}>
    <MapPin className="h-6 w-6" />
  </div>
);

export const ListingCardTile = ({ listing }) => {
  const navigate = useNavigate();
  return (
    <button
      data-testid={`listing-tile-${listing.id}`}
      onClick={() => navigate(`/listing/${listing.id}`)}
      className="w-[152px] shrink-0 text-left transition-transform active:scale-[0.97]"
    >
      <div className="h-[132px] w-full overflow-hidden rounded-2xl bg-secondary">
        {listing.images?.[0] ? (
          <img src={imgUrl(listing.images[0])} alt={listing.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Fallback className="h-full w-full" />
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-bold leading-tight font-display">{listing.name}</p>
      <p className="truncate text-xs text-muted-foreground">{listing.seller.business_name}</p>
      <p className="mt-1 text-sm font-bold text-primary">
        {money(listing.price)}
        {listing.unit ? <span className="font-medium text-muted-foreground"> / {listing.unit}</span> : null}
      </p>
      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{distanceLabel(listing.distance_m)}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold">
        {listing.rating ? (
          <>
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {listing.rating}
          </>
        ) : (
          <span className="text-muted-foreground">New</span>
        )}
      </div>
    </button>
  );
};

export const ListingRow = ({ listing }) => {
  const navigate = useNavigate();
  return (
    <button
      data-testid={`listing-row-${listing.id}`}
      onClick={() => navigate(`/listing/${listing.id}`)}
      className="flex w-full items-stretch gap-3 rounded-2xl border border-border bg-white p-2.5 text-left transition-all hover:border-primary/40 hover:zz-shadow active:scale-[0.99]"
    >
      <div className="h-[86px] w-[86px] shrink-0 overflow-hidden rounded-xl bg-secondary">
        {listing.images?.[0] ? (
          <img src={imgUrl(listing.images[0])} alt={listing.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Fallback className="h-full w-full" />
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[15px] font-bold font-display">{listing.name}</p>
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold">
            {listing.rating ? (
              <>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {listing.rating}
              </>
            ) : (
              <span className="text-muted-foreground">New</span>
            )}
          </span>
        </div>
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          {listing.seller.business_name}
          {listing.seller.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
        </p>
        <p className="mt-1 text-sm font-bold text-primary">
          {listing.type === 'service' ? 'From ' : ''}
          {money(listing.price)}
          {listing.unit ? <span className="font-medium text-muted-foreground"> / {listing.unit}</span> : null}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold capitalize text-secondary-foreground">
            {listing.category}
          </span>
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {distanceLabel(listing.distance_m) || listing.seller.locality}
          </span>
        </div>
      </div>
    </button>
  );
};
