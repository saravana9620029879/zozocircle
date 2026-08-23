import axios from 'axios';

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const api = axios.create({ baseURL: `${BACKEND_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zz_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const imgUrl = (u) => (u && u.startsWith('/api') ? `${BACKEND_URL}${u}` : u);

export const apiError = (e) => {
  const d = e?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(' ');
  return e?.message || 'Something went wrong';
};

export const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

export const distanceLabel = (m) => {
  if (m === null || m === undefined) return '';
  if (m < 100) return 'Nearby';
  return m < 1000 ? `${Math.round(m)} m away` : `${(m / 1000).toFixed(1)} km away`;
};

export const whatsappLink = (number, listing) => {
  const msg =
    listing.type === 'service'
      ? `Hi, I found ${listing.name} on ZOZOCIRCLE. I would like to enquire/book a service. Is it available?`
      : `Hi, I found ${listing.name} on ZOZOCIRCLE. I would like to order/enquire about it. Is it available?`;
  return `https://wa.me/${String(number).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
};
