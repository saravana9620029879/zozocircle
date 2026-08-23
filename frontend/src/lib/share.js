import { money } from '@/lib/api';

export const shareCaption = (listing, url) =>
  listing.type === 'service'
    ? `${listing.name} — ${money(listing.price)}${listing.unit ? ` / ${listing.unit}` : ''}\nBook my service on ZOZOCIRCLE 👇\n${url}`
    : `${listing.name} — ${money(listing.price)}${listing.unit ? ` / ${listing.unit}` : ''}\nOrder from me on ZOZOCIRCLE 👇\n${url}`;

export const listingUrl = (id) => `${window.location.origin}/listing/${id}`;

export const shareOnWhatsApp = (listing) =>
  `https://wa.me/?text=${encodeURIComponent(shareCaption(listing, listingUrl(listing.id)))}`;
