import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import SafeQRCode from '@/components/shared/SafeQRCode';
import {
  Bus,
  MapPin,
  QrCode,
  Navigation,
  Calendar,
  Clock,
  ShieldCheck,
  Leaf,
  Users,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Sun,
  Moon,
  CheckCircle2,
  Timer,
  Radio,
  Gauge,
  HelpCircle,
  ChevronDown,
  Layers,
  ArrowUpRight,
  Zap,
  Ticket,
  Compass
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Fetch real upcoming events
  const { data: eventsData, isLoading: isEventsLoading } = useQuery({
    queryKey: ['landing-upcoming-events'],
    queryFn: () => eventsApi.getUpcoming().then((r) => r.data),
  });

  const events = Array.isArray(eventsData) ? eventsData : [];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Simulated telemetry live shuttle progress animation
  const [simulatedProgress, setSimulatedProgress] = useState(68);
  const [simulatedSpeed, setSimulatedSpeed] = useState(48);

  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedProgress((p) => (p >= 98 ? 15 : p + 1));
      setSimulatedSpeed(40 + Math.floor(Math.sin(Date.now() / 2000) * 12));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const faqs = [
    {
      q: 'How do I book a seat on an event shuttle?',
      a: 'Browse through our upcoming events, pick your preferred smart pickup station, and reserve your seat in 1 click. You will immediately receive a digital boarding pass with a verified QR code.',
    },
    {
      q: 'How does live shuttle tracking work?',
      a: 'All event shuttles are equipped with GPS telemetry that broadcasts exact live locations, current travel speed, and estimated arrival times (ETA) directly to your screen.',
    },
    {
      q: 'What happens if a shuttle route is fully booked?',
      a: 'You can join the smart waiting list with 1 tap. If another passenger cancels or an additional shuttle is deployed by event organizers, seats are automatically assigned in order.',
    },
    {
      q: 'How do I board the shuttle on event day?',
      a: 'Show the digital QR pass from your "My Tickets" tab on your smartphone to the shuttle driver. The driver will scan it instantly using their handheld cockpit scanner.',
    },
    {
      q: 'Is the event shuttle service free for attendees?',
      a: 'Yes, event organizers provide shuttle transportation for registered attendees and participants to ensure safe, zero-stress transit to and from the venue.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#ffffff] dark:bg-[#0d0f12] text-[#151515] dark:text-[#f3f4f6] font-sans selection:bg-[#ffac00] selection:text-black">
      {/* 1. Header Navigation (Rivian Clean Architectural Bar) */}
      <header className="sticky top-0 z-50 w-full border-b border-[#e5e7eb] dark:border-[#1f242d] bg-white/90 dark:bg-[#0d0f12]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#151515] dark:bg-[#ffac00] text-white dark:text-black shadow-sm">
              <Bus className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-foreground font-sans">
                SMART SHUTTLE
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#f2f2f2] dark:bg-[#1a1f26] text-[#151515] dark:text-[#ffac00] font-bold border border-[#e5e7eb] dark:border-[#2d3748]">
                TRANSIT NETWORK
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#live-radar" className="hover:text-foreground transition-colors">
              Live Fleet
            </a>
            <a href="#events" className="hover:text-foreground transition-colors">
              Upcoming Events
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full text-muted-foreground hover:bg-[#f2f2f2] dark:hover:bg-[#1a1f26] hover:text-foreground transition-all duration-200 border border-transparent hover:border-[#e5e7eb] dark:hover:border-[#2d3748]"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="h-4 w-4 text-[#ffac00]" /> : <Moon className="h-4 w-4 text-[#151515]" />}
            </button>

            {isAuthenticated ? (
              <Button
                className="h-10 px-6 font-bold text-xs rounded-full bg-[#151515] dark:bg-[#ffac00] hover:bg-[#252525] dark:hover:bg-[#e69b00] text-white dark:text-black shadow-md transition-all hover:scale-[1.02]"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="h-10 px-4 font-semibold text-xs rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
                <Button
                  className="h-10 px-6 font-bold text-xs rounded-full bg-[#ffac00] hover:bg-[#e69b00] text-black shadow-sm transition-all hover:scale-[1.02]"
                  onClick={() => navigate('/register')}
                >
                  Get Pass <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section (Rivian Style: Full-Bleed Real Transit & Event Atmosphere) */}
      <section className="relative min-h-[85vh] sm:min-h-[90vh] flex flex-col justify-end overflow-hidden">
        {/* Real Photographic Background Image with Cinematic Dark Gradient Vignette */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=2070&auto=format&fit=crop"
            alt="Event Shuttle Transit"
            className="w-full h-full object-cover object-center"
          />
          {/* Rivian Multi-stop Dark Cinematic Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
        </div>

        {/* Hero Content (Positioned Bottom-Left with Rivian Architectural Layout) */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 pt-32 space-y-7">
          {/* Rivian Signature Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-mono font-bold bg-white/10 text-white border border-white/20 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#ffac00] animate-ping" />
            <span className="tracking-widest uppercase text-[11px]">ELECTRIC EVENT TRANSIT NETWORK</span>
            <span className="text-[#ffac00]">• REAL-TIME GPS</span>
          </div>

          {/* Monumental Headline */}
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.035em] text-white leading-[1.05] font-sans">
              Effortless Arrivals For Every <span className="text-[#ffac00]">Event.</span>
            </h1>
            <p className="max-w-xl text-base sm:text-lg text-white/80 leading-relaxed font-normal">
              Direct point-to-point event shuttles, real-time GPS telemetry radar, and instant digital QR boarding passes for seamless festival and summit transit.
            </p>
          </div>

          {/* Rivian Dual Action Pill Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
            <Button
              className="h-12 px-8 font-bold text-sm rounded-full bg-[#ffac00] hover:bg-[#e69b00] text-black shadow-lg shadow-black/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => navigate(isAuthenticated ? '/participant/bookings' : '/register')}
            >
              <Ticket className="h-4 w-4 mr-2" /> Book Your Shuttle Pass
            </Button>
            <Button
              variant="outline"
              className="h-12 px-7 font-bold text-sm rounded-full border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                const el = document.getElementById('live-radar');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Navigation className="h-4 w-4 mr-2 text-[#ffac00]" /> View Live Shuttle Radar
            </Button>
          </div>

          {/* Social Proof / Fleet Stats Strip (Frosted Glass with Rivian Accent Colors) */}
          <div className="pt-8 max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/15 backdrop-blur-md">
              <p className="text-2xl sm:text-3xl font-extrabold font-mono text-white font-tabular">50,000+</p>
              <p className="text-xs text-white/70 mt-0.5 font-medium">Attendees Transported</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/15 backdrop-blur-md">
              <p className="text-2xl sm:text-3xl font-extrabold font-mono text-[#629b5c] font-tabular">99.8%</p>
              <p className="text-xs text-white/70 mt-0.5 font-medium">On-Time Arrival Rate</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/15 backdrop-blur-md">
              <p className="text-2xl sm:text-3xl font-extrabold font-mono text-[#ffac00] font-tabular">120+</p>
              <p className="text-xs text-white/70 mt-0.5 font-medium">Active Fleet Shuttles</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/15 backdrop-blur-md">
              <p className="text-2xl sm:text-3xl font-extrabold font-mono text-[#77afd8] font-tabular">~120t</p>
              <p className="text-xs text-white/70 mt-0.5 font-medium">CO₂ Emissions Saved</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Rivian Gallery Showcase: Live Radar HUD & Digital Pass */}
      <section id="live-radar" className="py-20 sm:py-28 bg-[#f2f2f2] dark:bg-[#12151b] border-b border-[#e5e7eb] dark:border-[#1f242d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#151515] dark:text-[#ffac00]">
                OPERATIONS HUD & DIGITAL PASS
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-foreground font-sans">
                Precision Event Transit
              </h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
              Track live shuttle positions in real-time, view verified driver telemetry, and board with instant contactless QR passes.
            </p>
          </div>

          {/* Dual Card Showcase */}
          <div className="grid gap-8 lg:grid-cols-12 items-center">
            {/* Left: Live Route Telemetry Terminal (7 cols) */}
            <div className="lg:col-span-7 rounded-3xl border border-[#e5e7eb] dark:border-[#262c36] bg-white dark:bg-[#181c24] shadow-xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-[#e5e7eb] dark:border-[#262c36] pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#629b5c] animate-ping" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#629b5c]">
                    Live Route Active
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#151515] text-[#ffac00] dark:bg-[#222834]">
                  BUS #104 EN ROUTE
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-foreground">
                  Global Tech Summit 2026 Express
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Route: Central Station Terminal → Silicon Convention Center
                </p>
              </div>

              {/* Telemetry Progress & Speed Gauges */}
              <div className="p-5 rounded-2xl bg-[#f8f9fa] dark:bg-[#12151b] border border-[#e5e7eb] dark:border-[#262c36] space-y-4">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Timer className="h-4 w-4 text-[#ffac00]" /> Next Station Arrival in 4 mins
                  </span>
                  <span className="font-bold text-foreground font-tabular">{simulatedProgress}% Completed</span>
                </div>
                <div className="h-3 w-full rounded-full bg-[#e5e7eb] dark:bg-[#262c36] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#ffac00] transition-all duration-700"
                    style={{ width: `${simulatedProgress}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-mono block">Speed</span>
                    <span className="font-mono font-bold text-foreground text-sm">{simulatedSpeed} km/h</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-mono block">Distance</span>
                    <span className="font-mono font-bold text-foreground text-sm">2.4 km Left</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-mono block">Driver</span>
                    <span className="font-bold text-foreground text-sm truncate block">Alex Rivera</span>
                  </div>
                </div>
              </div>

              {/* Station Waypoints */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <MapPin className="h-4 w-4 text-[#77afd8]" />
                  <span>Central Metro Terminal</span>
                </div>
                <div className="h-0.5 flex-1 mx-3 bg-[#e5e7eb] dark:bg-[#262c36] border-t border-dashed border-[#ffac00]" />
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <MapPin className="h-4 w-4 text-[#629b5c]" />
                  <span>Convention Pavilion</span>
                </div>
              </div>
            </div>

            {/* Right: Digital Aluminum Boarding Pass (5 cols) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-[#e5e7eb] dark:border-[#262c36] bg-white dark:bg-[#181c24] space-y-4 relative overflow-hidden">
                <div className="h-2 w-full bg-[#ffac00] absolute top-0 left-0 right-0" />

                <div className="flex items-center justify-between border-b border-[#e5e7eb] dark:border-[#262c36] pb-3 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#151515] text-[#ffac00] flex items-center justify-center">
                      <Bus className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                      Digital Boarding Pass
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#629b5c]/15 text-[#629b5c]">
                    VERIFIED
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#ffac00] font-bold">Priority Seat</span>
                  <p className="text-lg font-bold text-foreground">Sarah Jenkins</p>
                  <p className="text-xs text-muted-foreground font-mono">Seat 14A • Bus 104 • Global Tech Summit</p>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-4 bg-[#f8f9fa] dark:bg-white rounded-2xl shadow-inner my-2 border border-[#e5e7eb]">
                  <SafeQRCode value="SHUTTLE-PASS-2026-VIP-4482" size={135} />
                  <span className="font-mono text-[10px] font-bold text-slate-800 mt-2 tracking-wider">
                    #PASS-4482-VIP
                  </span>
                </div>

                <Button
                  className="w-full h-11 rounded-full font-bold text-xs bg-[#151515] dark:bg-[#ffac00] text-white dark:text-black hover:opacity-90 shadow-md"
                  onClick={() => navigate(isAuthenticated ? '/participant/tickets' : '/register')}
                >
                  <QrCode className="h-4 w-4 mr-1.5" /> Claim Your Digital Pass
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Full-Bleed Event & Party Atmosphere Section (Real Event Atmosphere) */}
      <section className="relative py-28 sm:py-36 overflow-hidden">
        {/* Real Festival / Concert / Event Atmosphere Photography */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop"
            alt="Event and Festival Gathering"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/60" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-6">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#ffac00]">
              ZERO-STRESS EVENT TRANSIT
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] text-white leading-tight font-sans">
              From Your Front Door Straight to the Main Stage.
            </h2>
            <p className="text-base sm:text-lg text-white/80 leading-relaxed">
              No parking headaches, no expensive rideshares, and no navigating crowded lots. Our organized event shuttle fleet transports attendees directly to venue VIP gates and entrances.
            </p>
            <div className="pt-2">
              <Button
                className="h-12 px-8 font-bold text-sm rounded-full bg-[#ffac00] hover:bg-[#e69b00] text-black shadow-xl"
                onClick={() => navigate(isAuthenticated ? '/participant/bookings' : '/register')}
              >
                Browse Upcoming Shuttles <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Rivian Architectural Bento Grid: Mobility Features */}
      <section id="features" className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#151515] dark:text-[#ffac00]">
            FLEET ARCHITECTURE & PASSENGER TECH
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-foreground font-sans">
            Built For Seamless Group Mobility
          </h2>
        </div>

        {/* 6-Card Clean Architectural Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-[#f8f9fa] dark:bg-[#14171d] border border-[#e5e7eb] dark:border-[#222834] hover:border-[#151515] dark:hover:border-[#ffac00] transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#77afd8]/15 text-[#77afd8] flex items-center justify-center font-bold">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Smart Pickup Station Clustering</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Intelligent geo-clustering routes attendees to designated neighborhood hubs to minimize individual walking distance and speed up boarding.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl bg-[#f8f9fa] dark:bg-[#14171d] border border-[#e5e7eb] dark:border-[#222834] hover:border-[#151515] dark:hover:border-[#ffac00] transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ffac00]/15 text-[#ffac00] flex items-center justify-center font-bold">
              <QrCode className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Instant Contactless QR Boarding</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Fast boarding pass verification with cryptographically signed QR codes scanned by shuttle captains in less than 300 milliseconds.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-[#f8f9fa] dark:bg-[#14171d] border border-[#e5e7eb] dark:border-[#222834] hover:border-[#151515] dark:hover:border-[#ffac00] transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#629b5c]/15 text-[#629b5c] flex items-center justify-center font-bold">
              <Navigation className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Live Telemetry & GPS Radar</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Watch your assigned event shuttle approach in real time on an interactive map with exact speed, route progress, and minute countdowns.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-8 rounded-3xl bg-[#f8f9fa] dark:bg-[#14171d] border border-[#e5e7eb] dark:border-[#222834] hover:border-[#151515] dark:hover:border-[#ffac00] transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#e84826]/15 text-[#e84826] flex items-center justify-center font-bold">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Automated Smart Waiting Lists</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              When high-demand routes fill up, our algorithm queues standby attendees and auto-deploys additional fleet shuttles to meet peak capacity.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-8 rounded-3xl bg-[#f8f9fa] dark:bg-[#14171d] border border-[#e5e7eb] dark:border-[#222834] hover:border-[#151515] dark:hover:border-[#ffac00] transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#629b5c]/15 text-[#629b5c] flex items-center justify-center font-bold">
              <Leaf className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Zero-Emission & Carbon Offsets</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Track quantified carbon savings per event trip by replacing hundreds of individual cars with coordinated clean shuttle runs.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-8 rounded-3xl bg-[#f8f9fa] dark:bg-[#14171d] border border-[#e5e7eb] dark:border-[#222834] hover:border-[#151515] dark:hover:border-[#ffac00] transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#151515]/10 dark:bg-white/10 text-foreground flex items-center justify-center font-bold">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Verified Captains & Fleet Safety</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Every driver and vehicle undergoes strict dispatch verification with live telematics monitoring and direct dispatcher coordination.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Live Upcoming Events & Transit Explorer */}
      <section id="events" className="py-20 sm:py-28 bg-[#f2f2f2] dark:bg-[#12151b] border-y border-[#e5e7eb] dark:border-[#1f242d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#151515] dark:text-[#ffac00]">
                RESERVE YOUR PASS
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-foreground font-sans mt-1">
                Upcoming Events & Shuttles
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Select an upcoming summit, festival, or conference to view pickup stations and claim your seat.
              </p>
            </div>

            <Button
              className="h-11 px-6 font-bold text-xs rounded-full bg-[#151515] dark:bg-[#ffac00] text-white dark:text-black hover:opacity-90 shadow-sm"
              onClick={() => navigate(isAuthenticated ? '/participant/bookings' : '/register')}
            >
              Browse All Routes <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>

          {isEventsLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#ffac00] border-t-transparent" />
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#ffac00]">
                Scanning Scheduled Transit Routes...
              </p>
            </div>
          ) : events.length === 0 ? (
            <Card className="border-dashed bg-white dark:bg-[#181c24]">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Calendar className="h-10 w-10 opacity-30 mb-2 text-[#ffac00]" />
                <p className="text-base font-semibold text-foreground">No upcoming events scheduled</p>
                <p className="text-xs text-muted-foreground mt-1">Check back soon for newly published transit routes.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.slice(0, 6).map((event: any) => {
                const eventDate = new Date(event.date);
                const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                const day = eventDate.getDate();

                return (
                  <div
                    key={event.id}
                    className="p-6 rounded-3xl bg-white dark:bg-[#181c24] border border-[#e5e7eb] dark:border-[#262c36] hover:border-[#ffac00] hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col items-center justify-center w-12 h-14 rounded-2xl bg-[#f2f2f2] dark:bg-[#222834] border border-[#e5e7eb] dark:border-[#2d3748] text-foreground shrink-0">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">{month}</span>
                          <span className="text-lg font-bold font-mono leading-none">{day}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-[#151515] text-[#ffac00] dark:bg-[#262c36]">
                          SHUTTLE READY
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg text-foreground group-hover:text-[#ffac00] transition-colors">
                          {event.name}
                        </h3>
                        {event.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-[#629b5c] shrink-0" />
                            <span className="truncate">{event.address}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#e5e7eb] dark:border-[#262c36] flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">
                        {event.startTime ? `${event.startTime} Departure` : 'Scheduled'}
                      </span>
                      <Button
                        size="sm"
                        className="h-9 px-5 font-bold text-xs rounded-full bg-[#ffac00] hover:bg-[#e69b00] text-black shadow-sm"
                        onClick={() => navigate(isAuthenticated ? '/participant/bookings' : '/register')}
                      >
                        Reserve Pass <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 7. Rivian 3-Step Journey Pipeline */}
      <section id="how-it-works" className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#151515] dark:text-[#ffac00]">
            3-STEP JOURNEY
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-foreground font-sans">
            How It Works For Attendees
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="p-8 rounded-3xl bg-[#f8f9fa] dark:bg-[#14171d] border border-[#e5e7eb] dark:border-[#222834] space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#151515] text-white dark:bg-[#ffac00] dark:text-black font-mono font-bold text-base flex items-center justify-center">
              1
            </div>
            <h3 className="text-lg font-bold text-foreground">Select Event & Station</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Choose your upcoming event and pick your nearest designated pickup station or neighborhood cluster.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[#f8f9fa] dark:bg-[#14171d] border border-[#e5e7eb] dark:border-[#222834] space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#151515] text-white dark:bg-[#ffac00] dark:text-black font-mono font-bold text-base flex items-center justify-center">
              2
            </div>
            <h3 className="text-lg font-bold text-foreground">Receive Digital Boarding Pass</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Instantly receive a verified digital QR pass on your smartphone with seat confirmation and departure slot.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[#f8f9fa] dark:bg-[#14171d] border border-[#e5e7eb] dark:border-[#222834] space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#151515] text-white dark:bg-[#ffac00] dark:text-black font-mono font-bold text-base flex items-center justify-center">
              3
            </div>
            <h3 className="text-lg font-bold text-foreground">Track Live Bus & Board</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Watch your shuttle approach in real time on our GPS radar, scan your QR code with the driver, and ride comfortably.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Interactive FAQ Accordion */}
      <section id="faq" className="py-20 sm:py-28 bg-[#f2f2f2] dark:bg-[#12151b] border-t border-[#e5e7eb] dark:border-[#1f242d]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#151515] dark:text-[#ffac00]">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-foreground font-sans">
              Got Questions?
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-[#e5e7eb] dark:border-[#262c36] bg-white dark:bg-[#181c24] overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-6 text-left text-sm sm:text-base font-bold text-foreground hover:text-[#ffac00] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#ffac00]' : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-xs sm:text-sm text-muted-foreground border-t border-[#e5e7eb] dark:border-[#262c36] pt-4 leading-relaxed animate-in fade-in duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. Full-Bleed Midnight CTA Banner */}
      <section className="relative py-28 sm:py-36 overflow-hidden">
        {/* Real Evening Event Bus Transit Photography */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2069&auto=format&fit=crop"
            alt="Event Transit Fleet"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-black/50" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#ffac00]">
            SMART EVENT TRANSIT
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] text-white font-sans">
            Ready to Experience Seamless Event Transit?
          </h2>
          <p className="text-sm sm:text-base text-white/80 max-w-xl mx-auto">
            Join thousands of attendees enjoying effortless, real-time shuttle rides for upcoming festivals, conferences, and summits.
          </p>
          <div className="pt-4 flex justify-center">
            <Button
              className="h-12 px-9 font-bold text-sm rounded-full bg-[#ffac00] hover:bg-[#e69b00] text-black shadow-xl shadow-black/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => navigate(isAuthenticated ? '/participant/bookings' : '/register')}
            >
              Get Your Free Shuttle Pass <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* 10. Minimalist Rivian Footer */}
      <footer className="border-t border-[#e5e7eb] dark:border-[#1f242d] bg-white dark:bg-[#0d0f12] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#151515] text-[#ffac00] dark:bg-[#ffac00] dark:text-black">
              <Bus className="h-4 w-4" />
            </div>
            <span className="text-sm font-extrabold tracking-tight text-foreground">
              SMART SHUTTLE MANAGEMENT SYSTEM
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <span>© 2026 Smart Transit Network.</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#629b5c]" />
              Telemetry Online
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
