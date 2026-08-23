import { useEffect, useState, useCallback } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';

export const NotificationBell = () => {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    api.get('/notifications').then((r) => setData(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const markAll = async () => {
    await api.post('/notifications/read-all').catch(() => {});
    load();
  };

  return (
    <>
      <button
        data-testid="notification-bell"
        onClick={() => setOpen(true)}
        className="relative rounded-full border border-border p-2.5"
        aria-label="Alerts"
      >
        <Bell className="h-5 w-5 text-foreground/70" />
        {data.unread > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
          >
            {data.unread}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setOpen(false)}>
            <div
              className="mx-auto max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 zz-rise"
              onClick={(e) => e.stopPropagation()}
              data-testid="notifications-panel"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold font-display">Alerts</h3>
                <div className="flex items-center gap-3">
                  {data.unread > 0 && (
                    <button
                      data-testid="mark-all-read"
                      onClick={markAll}
                      className="flex items-center gap-1 text-xs font-bold text-primary"
                    >
                      <CheckCheck className="h-4 w-4" /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} data-testid="close-notifications">
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {data.items.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground" data-testid="notifications-empty">
                  No alerts yet. You'll hear from us when a listing is reviewed.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {data.items.map((n) => (
                    <div
                      key={n.id}
                      data-testid={`notification-${n.id}`}
                      className={`rounded-2xl border p-4 ${
                        n.read ? 'border-border' : 'border-primary/40 bg-secondary/50'
                      }`}
                    >
                      <p className="text-sm font-bold">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
