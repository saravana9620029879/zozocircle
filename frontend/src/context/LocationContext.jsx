import { createContext, useContext, useEffect, useState } from 'react';

export const LOCALITIES = [
  { name: 'Whitefield, Bengaluru', lat: 12.9724, lng: 77.7472 },
  { name: 'Koramangala, Bengaluru', lat: 12.9352, lng: 77.6245 },
  { name: 'Indiranagar, Bengaluru', lat: 12.9719, lng: 77.6412 },
  { name: 'HSR Layout, Bengaluru', lat: 12.9116, lng: 77.6389 },
  { name: 'Jayanagar, Bengaluru', lat: 12.9299, lng: 77.5826 },
  { name: 'Marathahalli, Bengaluru', lat: 12.9591, lng: 77.6974 },
  { name: 'Malleshwaram, Bengaluru', lat: 13.0035, lng: 77.5709 },
  { name: 'BTM Layout, Bengaluru', lat: 12.9166, lng: 77.6101 },
  { name: 'Hebbal, Bengaluru', lat: 13.0358, lng: 77.597 },
  { name: 'Electronic City, Bengaluru', lat: 12.8452, lng: 77.6602 },
];

const LocationContext = createContext(null);

export const LocationProvider = ({ children }) => {
  const [loc, setLoc] = useState(() => {
    const saved = localStorage.getItem('zz_loc');
    return saved ? JSON.parse(saved) : null;
  });
  const [radius, setRadius] = useState(() => Number(localStorage.getItem('zz_radius') || 2));
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (loc) localStorage.setItem('zz_loc', JSON.stringify(loc));
  }, [loc]);

  useEffect(() => {
    localStorage.setItem('zz_radius', String(radius));
  }, [radius]);

  const requestGeo = () => {
    if (!navigator.geolocation) {
      setStatus('denied');
      return;
    }
    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'Your current location', source: 'gps' });
        setStatus('granted');
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const setManual = (l) => {
    setLoc({ ...l, source: 'manual' });
    setStatus('manual');
  };

  return (
    <LocationContext.Provider value={{ loc, radius, setRadius, status, requestGeo, setManual, setLoc }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLoc = () => useContext(LocationContext);
