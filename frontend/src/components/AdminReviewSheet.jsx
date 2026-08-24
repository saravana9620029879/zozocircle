import { createPortal } from 'react-dom';
import { X, Check, ImageOff, BadgeCheck } from 'lucide-react';
import { imgUrl, money } from '@/lib/api';

const Row = ({ label, value, testid }) =>
  value === null || value === undefined || value === '' ? null : (
    <div className="border-b border-border py-2.5 last:border-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm font-semibold" data-testid={testid}>
        {value}
      </p>
    </div>
  );

const Gallery = ({ images, testid }) => (
  <div data-testid={testid}>
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
      Images ({images?.length || 0})
    </p>
    {images?.length ? (
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {images.map((src, i) => (
          <a
            key={src}
            href={imgUrl(src)}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`review-image-${i}`}
            className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border"
          >
            <img src={imgUrl(src)} alt={`Submitted photo ${i + 1}`} className="h-full w-full object-cover" />
          </a>
        ))}
      </div>
    ) : (
      <div
        className="flex h-24 flex-col items-center justify-center gap-1 rounded-xl bg-secondary text-primary/40"
        data-testid={`${testid}-empty`}
      >
        <ImageOff className="h-5 w-5" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">No images submitted</span>
      </div>
    )}
  </div>
);

export const AdminReviewSheet = ({ review, onClose, onApprove, onReject, onVerify }) => {
  if (!review) return null;
  const { kind, data: d } = review;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="mx-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white pb-4 zz-rise"
        onClick={(e) => e.stopPropagation()}
        data-testid="admin-review-sheet"
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-border bg-white/95 px-5 py-4 backdrop-blur-xl">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Review {kind === 'seller' ? 'business' : 'listing'}
            </p>
            <h3 className="truncate text-lg font-bold font-display" data-testid="review-title">
              {kind === 'seller' ? d.business_name : d.name}
            </h3>
            <span className="text-xs capitalize text-muted-foreground" data-testid="review-current-status">
              Current status: {kind === 'seller' ? d.verification_status : d.status}
            </span>
          </div>
          <button onClick={onClose} data-testid="close-review-sheet" className="shrink-0 pt-1">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 pt-3">
          {kind === 'seller' ? (
            <>
              <Gallery images={d.logo_url ? [d.logo_url] : []} testid="review-seller-images" />
              <div className="mt-3">
                <Row label="Business name" value={d.business_name} testid="review-business-name" />
                <Row label="Seller name" value={d.full_name} testid="review-full-name" />
                <Row label="Business type" value={d.business_type} testid="review-business-type" />
                <Row
                  label="Categories"
                  value={(d.categories || []).join(', ') || '—'}
                  testid="review-categories"
                />
                <Row label="Description" value={d.description} testid="review-description" />
                <Row label="Locality" value={`${d.locality}, ${d.city}`} testid="review-locality" />
                <Row label="Service radius" value={`${d.service_radius_km} km`} testid="review-service-radius" />
                <Row label="Operating hours" value={d.operating_hours} testid="review-operating-hours" />
                <Row label="Mobile number" value={d.phone} testid="review-phone" />
                <Row label="WhatsApp number" value={d.whatsapp_number} testid="review-whatsapp" />
                <Row
                  label="Submitted on"
                  value={d.created_at ? new Date(d.created_at).toLocaleString('en-IN') : ''}
                  testid="review-created-at"
                />
              </div>
            </>
          ) : (
            <>
              <Gallery images={d.images} testid="review-listing-images" />
              <div className="mt-3">
                <Row label="Name" value={d.name} testid="review-listing-name" />
                <Row label="Seller / business" value={d.seller_name} testid="review-listing-seller" />
                <Row label="Seller locality" value={d.seller_locality} testid="review-listing-locality" />
                <Row label="Type" value={d.type} testid="review-listing-type" />
                <Row label="Category" value={d.category} testid="review-listing-category" />
                <Row label="Description" value={d.description} testid="review-listing-description" />
                <Row label="Price" value={money(d.price)} testid="review-listing-price" />
                <Row label="Unit" value={d.unit || '—'} testid="review-listing-unit" />
                <Row label="Availability" value={d.availability} testid="review-listing-availability" />
                <Row
                  label="Highlights"
                  value={(d.highlights || []).join(' · ') || '—'}
                  testid="review-listing-highlights"
                />
                <Row label="Active" value={d.active ? 'Yes' : 'No'} testid="review-listing-active" />
                <Row
                  label="Engagement"
                  value={`${d.views || 0} views · ${d.whatsapp_clicks || 0} WhatsApp clicks`}
                  testid="review-listing-engagement"
                />
                <Row
                  label="Submitted on"
                  value={d.created_at ? new Date(d.created_at).toLocaleString('en-IN') : ''}
                  testid="review-listing-created-at"
                />
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 mt-4 space-y-2 border-t border-border bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3">
          <div className="flex gap-2">
            <button
              data-testid="review-approve-btn"
              onClick={onApprove}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
            >
              <Check className="h-4 w-4" /> Approve
            </button>
            <button
              data-testid="review-reject-btn"
              onClick={onReject}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-destructive/40 py-3.5 text-sm font-bold text-destructive"
            >
              <X className="h-4 w-4" /> Reject
            </button>
          </div>
          {kind === 'seller' && (
            <button
              data-testid="review-verify-btn"
              onClick={onVerify}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-primary/30 py-3 text-sm font-bold text-primary"
            >
              <BadgeCheck className="h-4 w-4" /> Approve &amp; mark verified
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
