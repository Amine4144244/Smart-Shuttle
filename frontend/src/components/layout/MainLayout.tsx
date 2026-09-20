import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSocket } from '@/hooks/useSocket';
import { cn } from '@/lib/utils';
import NotificationCenter from '@/components/shared/NotificationCenter';
import BackButton from '@/components/shared/BackButton';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Truck,
  UserCircle,
  Route,
  MapPin,
  Ticket,
  BarChart3,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  Bus,
  Shield,
  Radio,
  Navigation,
  Sparkles,
} from 'lucide-react';

const roleMenuItems: Record<string, { label: string; path: string; icon: any }[]> = {
  SUPER_ADMIN: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Events', path: '/admin/events', icon: Calendar },
    { label: 'Drivers', path: '/admin/drivers', icon: UserCircle },
    { label: 'Vehicles', path: '/admin/vehicles', icon: Truck },
    { label: 'Routes', path: '/admin/routes', icon: Route },
    { label: 'Pickup Points', path: '/admin/pickup-points', icon: MapPin },
    { label: 'Reservations', path: '/admin/reservations', icon: Ticket },
    { label: 'Trips', path: '/admin/trips', icon: Bus },
    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { label: 'Active Shuttles', path: '/admin/active-shuttles', icon: Radio },
  ],
  ORGANIZER: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Events', path: '/admin/events', icon: Calendar },
    { label: 'Drivers', path: '/admin/drivers', icon: UserCircle },
    { label: 'Vehicles', path: '/admin/vehicles', icon: Truck },
    { label: 'Routes', path: '/admin/routes', icon: Route },
    { label: 'Pickup Points', path: '/admin/pickup-points', icon: MapPin },
    { label: 'Reservations', path: '/admin/reservations', icon: Ticket },
    { label: 'Trips', path: '/admin/trips', icon: Bus },
    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { label: 'Active Shuttles', path: '/admin/active-shuttles', icon: Radio },
  ],
  DRIVER: [
    { label: 'Dashboard', path: '/driver/dashboard', icon: LayoutDashboard },
    { label: 'My Trips', path: '/driver/trips', icon: Bus },
    { label: 'GPS Tracking', path: '/driver/tracking', icon: Navigation },
  ],
  EMPLOYEE: [
    { label: 'Dashboard', path: '/participant/dashboard', icon: LayoutDashboard },
    { label: 'Book Shuttle', path: '/participant/bookings', icon: Calendar },
    { label: 'My Boarding Passes', path: '/participant/tickets', icon: Ticket },
    { label: 'Live Shuttle Radar', path: '/participant/track', icon: Radio },
  ],
  PARTICIPANT: [
    { label: 'Dashboard', path: '/participant/dashboard', icon: LayoutDashboard },
    { label: 'Book Shuttle', path: '/participant/bookings', icon: Calendar },
    { label: 'My Boarding Passes', path: '/participant/tickets', icon: Ticket },
    { label: 'Live Shuttle Radar', path: '/participant/track', icon: Radio },
  ],
};

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const { user, logout } = useAuthStore();
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isParticipant = user?.role === 'EMPLOYEE' || user?.role === 'PARTICIPANT';

  const roleHomePaths: Record<string, string> = {
    SUPER_ADMIN: '/admin/dashboard',
    ORGANIZER: '/admin/dashboard',
    DRIVER: '/driver/dashboard',
    EMPLOYEE: '/participant/dashboard',
    PARTICIPANT: '/participant/dashboard',
  };
  const isHomePage = location.pathname === roleHomePaths[user?.role || ''];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const menuItems = roleMenuItems[user?.role || 'EMPLOYEE'] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeVariant = (role?: string) => {
    if (role === 'SUPER_ADMIN') return 'live';
    if (role === 'DRIVER') return 'scheduled';
    return 'secondary';
  };

  return (
    <div
      className={cn(
        'flex min-h-screen font-sans',
        isParticipant
          ? 'bg-[#fafafa] dark:bg-[#0c0d10] text-neutral-900 dark:text-neutral-100 selection:bg-[#ffac00] selection:text-black'
          : 'bg-background text-foreground'
      )}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[110] flex w-64 flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl lg:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isParticipant
            ? 'bg-white dark:bg-[#111318] text-neutral-900 dark:text-neutral-100 border-r border-neutral-200/80 dark:border-neutral-800/90'
            : 'bg-card text-card-foreground border-r border-border/80 lg:shadow-sm'
        )}
      >
        {/* Logo / Brand Header */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center justify-between px-5',
            isParticipant ? 'border-b border-neutral-200/80 dark:border-neutral-800/80' : 'border-b border-border/70'
          )}
        >
          <div className="flex items-center gap-3">
            {isParticipant ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md">
                <Bus className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/25">
                <Bus className="h-5 w-5 text-white" />
              </div>
            )}

            <div className="min-w-0">
              {isParticipant ? (
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="truncate text-sm font-extrabold tracking-tight text-neutral-950 dark:text-white">
                      Smart Shuttle
                    </h2>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ffac00]" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    Passenger Portal
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="truncate text-sm font-bold tracking-tight text-foreground">Smart Shuttle</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('h-1.5 w-1.5 rounded-full', isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {isConnected ? 'Telemetry Live' : 'Connecting'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'p-1.5 lg:hidden',
              isParticipant
                ? 'rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400'
                : 'rounded-lg hover:bg-muted text-muted-foreground'
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav
          className={cn(
            'flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-1',
            isParticipant ? 'py-5 space-y-1.5' : 'scrollbar-thin'
          )}
        >
          <div
            className={cn(
              'px-3 pb-2 text-[10px] uppercase',
              isParticipant
                ? 'font-extrabold tracking-widest text-neutral-400 dark:text-neutral-500'
                : 'font-bold tracking-widest text-muted-foreground/60 font-mono'
            )}
          >
            {isParticipant ? 'Passenger Menu' : 'Navigation Menu'}
          </div>

          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                isParticipant
                  ? cn(
                      'group relative flex items-center gap-3 rounded-full px-3.5 py-2.5 text-xs font-bold transition-all duration-200',
                      isActive
                        ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-950 dark:hover:text-white'
                    )
                  : cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs md:text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-primary/10 text-primary font-bold shadow-xs'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Left indicator bar for Admin/Driver */}
                  {!isParticipant && isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
                  )}

                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform group-hover:scale-105',
                      isParticipant
                        ? isActive
                          ? 'text-[#ffac00] dark:text-neutral-950'
                          : 'text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white'
                        : isActive
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    )}
                  />
                  <span className="truncate">{item.label}</span>

                  {/* Right dot for Participant */}
                  {isParticipant && isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#ffac00]" />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Participant Quick Help Pill */}
          {isParticipant && (
            <div className="pt-6 px-1">
              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/80 dark:bg-neutral-900/60 p-4 space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-[#ffac00]">
                  <Sparkles className="h-3 w-3" />
                  <span>Express Transit</span>
                </div>
                <p className="text-xs font-bold text-neutral-900 dark:text-white">
                  Boarding with zero wait
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Have your digital QR pass ready at the shuttle entrance for instant scan.
                </p>
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div
          className={cn(
            'p-3 space-y-1',
            isParticipant
              ? 'border-t border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40'
              : 'border-t border-border/70 bg-muted/20'
          )}
        >
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={cn(
              'flex w-full items-center justify-between px-3 py-2.5 text-xs transition-colors',
              isParticipant
                ? 'rounded-full px-3.5 py-2 font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                : 'rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-2">
              {darkMode ? (
                <Sun className={cn('h-4 w-4', isParticipant ? 'text-[#ffac00]' : 'text-amber-500')} />
              ) : (
                <Moon className="h-4 w-4 text-blue-500" />
              )}
              <span className="font-medium">{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
            </span>
            <span
              className={cn(
                'text-[10px] uppercase',
                isParticipant ? 'font-mono text-neutral-400' : 'font-mono text-muted-foreground'
              )}
            >
              {darkMode ? 'Dark' : 'Light'}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Navbar Header */}
        <header
          className={cn(
            'sticky top-0 z-30 flex h-16 shrink-0 items-center backdrop-blur-md',
            isParticipant
              ? 'border-b border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-[#0c0d10]/80'
              : 'border-b border-border/80 bg-background/80'
          )}
        >
          <div
            className={cn(
              'flex flex-1 items-center justify-between',
              isParticipant ? 'px-4 sm:px-6 lg:px-8' : 'px-4 md:px-6'
            )}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center lg:hidden',
                  isParticipant
                    ? 'rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14161c] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                    : 'rounded-lg border border-border/80 bg-card hover:bg-accent'
                )}
                aria-label="Open sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
              {!isHomePage && <BackButton />}
            </div>

            <div className="flex items-center gap-3">
              {/* Telemetry Status Pill */}
              {isParticipant ? (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-[#14161c]/90 text-xs shadow-xs">
                  <span className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-[#629b5c] animate-pulse' : 'bg-amber-500')} />
                  <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                    {isConnected ? 'Telemetry Online' : 'Connecting'}
                  </span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-border/60 bg-card/60 text-xs font-mono">
                  <span className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
                  <span className="text-muted-foreground text-[11px] font-sans">System Online</span>
                </div>
              )}

              <NotificationCenter />

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                {isParticipant ? (
                  /* Participant Rivian Pill Trigger */
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14161c] p-1.5 pr-3 transition-all hover:border-neutral-400 dark:hover:border-neutral-600 shadow-xs"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-extrabold text-xs">
                      {user?.firstName?.charAt(0)}
                      {user?.lastName?.charAt(0)}
                    </div>
                    <div className="hidden text-left sm:block">
                      <p className="text-xs font-extrabold text-neutral-950 dark:text-white leading-tight">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-[10px] text-neutral-400 capitalize font-medium">Passenger</p>
                    </div>
                    <ChevronDown className="hidden h-3 w-3 text-neutral-400 sm:block" />
                  </button>
                ) : (
                  /* Admin / Driver Classic Trigger */
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/80 p-1.5 pr-2.5 transition-all hover:border-primary/40 hover:bg-card"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-white text-xs shadow-sm">
                      {user?.firstName?.charAt(0)}
                      {user?.lastName?.charAt(0)}
                    </div>
                    <div className="hidden text-left sm:block">
                      <p className="text-xs font-bold leading-tight text-foreground">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize font-medium">
                        {user?.role?.toLowerCase().replace('_', ' ')}
                      </p>
                    </div>
                    <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                  </button>
                )}

                {dropdownOpen && (
                  <div
                    className={cn(
                      'absolute right-0 mt-2 overflow-hidden border p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 z-50',
                      isParticipant
                        ? 'w-64 rounded-3xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#14161c] p-2 shadow-2xl'
                        : 'w-60 rounded-xl border-border bg-card'
                    )}
                  >
                    <div
                      className={cn(
                        'px-3 py-2.5 mb-1',
                        isParticipant
                          ? 'border-b border-neutral-100 dark:border-neutral-800'
                          : 'border-b border-border/60'
                      )}
                    >
                      <p
                        className={cn(
                          'text-xs font-bold',
                          isParticipant ? 'font-extrabold text-neutral-950 dark:text-white' : 'text-foreground'
                        )}
                      >
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className={cn('text-[11px] truncate', isParticipant ? 'text-neutral-400' : 'text-muted-foreground')}>
                        {user?.email}
                      </p>
                      <div className="mt-1.5">
                        {isParticipant ? (
                          <span className="inline-flex rounded-full bg-[#ffac00]/20 px-2 py-0.5 text-[9px] font-extrabold text-neutral-950 dark:text-[#ffac00]">
                            PASSENGER ACCESS
                          </span>
                        ) : (
                          <Badge variant={getRoleBadgeVariant(user?.role)} className="text-[10px]">
                            {user?.role?.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/profile');
                        }}
                        className={cn(
                          'flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors',
                          isParticipant
                            ? 'rounded-full font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            : 'rounded-lg text-foreground hover:bg-secondary'
                        )}
                      >
                        <Shield className={cn('h-3.5 w-3.5', isParticipant ? 'text-[#ffac00]' : 'text-primary')} />
                        <span>Profile & Security</span>
                      </button>
                    </div>

                    <div
                      className={cn(
                        'mt-1 pt-1',
                        isParticipant
                          ? 'border-t border-neutral-100 dark:border-neutral-800'
                          : 'border-t border-border/60'
                      )}
                    >
                      <button
                        onClick={handleLogout}
                        className={cn(
                          'flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10',
                          isParticipant ? 'rounded-full font-bold' : 'rounded-lg'
                        )}
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
