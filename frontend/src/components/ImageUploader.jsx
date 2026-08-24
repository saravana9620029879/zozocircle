import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { api, apiError, imgUrl } from '@/lib/api';
import { ImagePlus, Loader2, X } from 'lucide-react';

export const ImageUploader = ({ images, setImages, max = 5, testid = 'image-uploader' }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  const pick = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, max - images.length);
    if (!files.length) return;
    setBusy(true);
    setUploadErr('');
    for (const f of files) {
      const fd = new FormData();
      fd.append('file', f);
      try {
        const { data } = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setImages((prev) => [...prev, data.url]);
      } catch (err) {
        setUploadErr(apiError(err));
        toast.error(apiError(err));
      }
    }
    setBusy(false);
    e.target.value = '';
  };

  return (
    <div data-testid={testid}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Photos</p>
        <p className="text-[11px] text-muted-foreground" data-testid="image-count">
          {images.length} / {max}
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {images.map((u, i) => (
          <div
            key={u}
            data-testid={`image-preview-${i}`}
            className={`relative h-20 w-20 overflow-hidden rounded-xl border ${
              i === 0 ? 'border-2 border-primary' : 'border-border'
            }`}
          >
            <img src={imgUrl(u)} alt="" className="h-full w-full object-cover" />
            {i === 0 ? (
              <span
                data-testid="cover-badge"
                className="absolute inset-x-0 bottom-0 bg-primary/90 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-primary-foreground"
              >
                Cover
              </span>
            ) : (
              <button
                type="button"
                data-testid={`set-cover-${i}`}
                title="Make this the cover photo"
                onClick={() => setImages([u, ...images.filter((x) => x !== u)])}
                className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white"
              >
                Set cover
              </button>
            )}
            <button
              type="button"
              data-testid={`remove-image-${i}`}
              onClick={() => setImages(images.filter((x) => x !== u))}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            data-testid="add-image-btn"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-border text-primary"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        data-testid="image-file-input"
        type="file"
        accept="image/*"
        multiple
        onChange={pick}
        className="hidden"
      />
      {uploadErr && (
        <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive" data-testid="upload-error">
          {uploadErr}
        </p>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Up to {max} photos. The first photo is the cover customers see on cards.
      </p>
    </div>
  );
};
