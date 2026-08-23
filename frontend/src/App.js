import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import { LocationProvider } from '@/context/LocationContext';
import { BottomNav } from '@/components/BottomNav';
import HomePage from '@/pages/Home';
import ExplorePage from '@/pages/Explore';
import ListingDetailPage from '@/pages/ListingDetail';
import SavedPage from '@/pages/Saved';
import AccountPage from '@/pages/Account';
import AuthPage from '@/pages/Auth';
import SellerOnboard from '@/pages/SellerOnboard';
import SellerDashboard from '@/pages/SellerDashboard';
import SellerProfile from '@/pages/SellerProfile';
import AddListing from '@/pages/AddListing';
import AdminDashboard from '@/pages/AdminDashboard';

const HIDE_NAV = ['/login', '/register', '/admin'];

const Shell = () => {
  const { pathname } = useLocation();
  const hide =
    HIDE_NAV.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/listing/') ||
    pathname.startsWith('/seller');
  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-white">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/listing/:id" element={<ListingDetailPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/seller/start" element={<SellerOnboard />} />
        <Route path="/seller/profile" element={<SellerProfile />} />
        <Route path="/seller/listing/:id" element={<AddListing />} />
        <Route path="/seller" element={<SellerDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
      {!hide && <BottomNav />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
          <Shell />
          <Toaster position="top-center" richColors />
        </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  );
}
