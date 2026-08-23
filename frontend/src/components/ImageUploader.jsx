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
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Photos</p>
      <div className="flex flex-wrap gap-2.5">
        {images.map((u, i) => (
          <div key={u} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
            <img src={imgUrl(u)} alt="" className="h-full w-full object-cover" />
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
    </div>
  );
};
