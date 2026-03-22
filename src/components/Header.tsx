import { useParking } from '@/context/ParkingContext';
import { Link, useLocation } from 'react-router-dom';
import { Code, LayoutGrid, LogIn, BarChart3, MapPin } from 'lucide-react';

export default function Header() {
  const { selectedLocation, globalAvailable, globalTotal, availableSlots, totalSlots, showSqlOverlay, toggleSqlOverlay } = useParking();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Locations', icon: MapPin },
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/admin-login', label: 'Admin', icon: LayoutGrid },
  ];

  const dispAvailable = selectedLocation ? availableSlots : globalAvailable;
  const dispTotal = selectedLocation ? totalSlots : globalTotal;

  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-mono font-bold text-sm text-primary-foreground">P</span>
            </div>
            <span className="font-semibold text-foreground tracking-tight">ParkSQL</span>
          </Link>

          {selectedLocation && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/20 text-xs font-mono text-primary">
              <MapPin className="w-3 h-3" />
              {selectedLocation.name}
            </div>
          )}

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm font-mono tabular-nums">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
            <span className="text-muted-foreground">
              <span className="text-success font-semibold">{dispAvailable}</span>
              /{dispTotal} Available
            </span>
          </div>

          <button
            onClick={toggleSqlOverlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors border ${
              showSqlOverlay
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            View Source
          </button>
        </div>
      </div>
    </header>
  );
}
