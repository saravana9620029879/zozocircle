import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Plus, Heart, User } from 'lucide-react';

const items = [
  { to: '/', icon: Home, label: 'Home', tid: 'nav-home' },
  { to: '/explore', icon: Search, label: 'Explore', tid: 'nav-explore' },
  { to: '/saved', icon: Heart, label: 'Saved', tid: 'nav-saved' },
  { to: '/account', icon: User, label: 'Account', tid: 'nav-account' },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 backdrop-blur-xl"
      data-testid="bottom-nav"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between px-3 pb-[env(safe-area-inset-bottom)] pt-2">
        {items.slice(0, 2).map((i) => (
          <NavItem key={i.to} {...i} />
        ))}
        <button
          data-testid="nav-list-business"
          onClick={() => navigate('/seller/start')}
          className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground zz-shadow transition-transform hover:scale-105 active:scale-95"
          aria-label="List your business"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>
        {items.slice(2).map((i) => (
          <NavItem key={i.to} {...i} />
        ))}
      </div>
    </nav>
  );
};

const NavItem = ({ to, icon: Icon, label, tid }) => (
  <NavLink
    to={to}
    end={to === '/'}
    data-testid={tid}
    className={({ isActive }) =>
      `flex w-16 flex-col items-center gap-1 pb-2 pt-1 text-[11px] font-semibold transition-colors ${
        isActive ? 'text-primary' : 'text-muted-foreground'
      }`
    }
  >
    <Icon className="h-5 w-5" />
    {label}
  </NavLink>
);
