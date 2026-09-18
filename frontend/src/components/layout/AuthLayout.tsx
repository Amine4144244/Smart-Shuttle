import { Outlet, Link } from 'react-router-dom';
import { Bus, ShieldCheck, Radio, MapPin, QrCode, ArrowLeft, Clock, Sparkles } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-[#0c0d10] text-neutral-900 dark:text-neutral-100 font-sans selection:bg-[#ffac00] selection:text-black">
      {/* Left Form Panel */}
      <div className="flex flex-1 flex-col justify-between px-6 py-8 sm:px-10 lg:px-14 xl:px-20 z-10">
        {/* Top bar with back to home */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 px-4 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 backdrop-blur hover:border-neutral-400 dark:hover:border-neutral-600 hover:text-neutral-900 dark:hover:text-white transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#629b5c] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              System Online
            </span>
          </div>
        </div>

        {/* Center Auth Card Container */}
        <div className="mx-auto my-auto w-full max-w-md py-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-md">
              <Bus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-neutral-950 dark:text-white">
                  Smart Shuttle
                </span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ffac00]" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                Mobility & Dispatch
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200/90 dark:border-neutral-800/80 bg-white dark:bg-[#14161c] p-7 sm:p-9 shadow-xl shadow-neutral-900/5 dark:shadow-black/40 backdrop-blur-sm">
            <Outlet />
          </div>

          <div className="mt-8 text-center text-xs text-neutral-400 dark:text-neutral-500">
            Encrypted with 256-bit SSL • Zero queue event transit
          </div>
        </div>

        {/* Bottom Minimal Info */}
        <div className="flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-600 pt-4 border-t border-neutral-200/60 dark:border-neutral-900">
          <span>© {new Date().getFullYear()} Smart Shuttle Operations</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[#629b5c]" /> Rivian Design Spec
          </span>
        </div>
      </div>

      {/* Right Brand & Real Photography Showcase Panel */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-neutral-950 p-12 xl:p-16 flex-col justify-between border-l border-neutral-800">
        {/* Real passenger transit shuttle & event photography background with deep dark gradient overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1600&q=80')`,
          }}
        />
        {/* Cinematic gradient scrims */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/85 to-neutral-950/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/70 via-transparent to-neutral-950/30" />
        
        {/* Subtle architectural hairline grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3rem_3rem]" />

        {/* Top Showcase Eyebrow Pill */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-700/80 bg-neutral-900/80 px-4 py-1.5 text-xs font-semibold text-neutral-200 backdrop-blur-md">
            <Radio className="h-3.5 w-3.5 animate-pulse text-[#629b5c]" />
            Live Event Transit Telemetry
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-[#ffac00]">
            <Sparkles className="h-3.5 w-3.5" /> High-Capacity Dispatch
          </div>
        </div>

        {/* Center Floating Rivian Telemetry Card & HUD */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div className="space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#ffac00]">
              Next-Gen Fleet Orchestration
            </span>
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tighter text-white leading-tight">
              Arrive at the event without traffic or parking friction.
            </h2>
            <p className="text-sm xl:text-base text-neutral-300 font-normal leading-relaxed">
              Real-time GPS shuttle tracking, dynamic stop routing, and instant digital QR boarding designed for premier gatherings and music festivals.
            </p>
          </div>

          {/* Floating Operations HUD Card */}
          <div className="rounded-3xl border border-neutral-800/90 bg-neutral-900/80 p-5 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffac00]/20 text-[#ffac00] border border-[#ffac00]/30">
                  <Bus className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-tight">Main Stage Express</span>
                    <span className="rounded-full bg-[#629b5c]/20 px-2 py-0.5 text-[10px] font-bold text-[#629b5c] border border-[#629b5c]/30">
                      ON ROUTE
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">Shuttle #SH-08 • 48 / 55 Seats</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-[#ffac00]">ETA 4 MIN</span>
                <p className="text-[10px] text-neutral-400">Terminal A Hub</p>
              </div>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-3 gap-3 pt-4 text-center">
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">Speed</span>
                <span className="text-sm font-extrabold text-white">42 km/h</span>
              </div>
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">Boarding</span>
                <span className="text-sm font-extrabold text-[#629b5c]">Instant QR</span>
              </div>
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/60 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">Telemetry</span>
                <span className="text-sm font-extrabold text-[#ffac00]">Sub-second</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="relative z-10 grid grid-cols-2 gap-3 pt-6 border-t border-neutral-800/80 text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-neutral-300">
              <MapPin className="h-3.5 w-3.5 text-[#ffac00]" />
            </div>
            <span>Smart pickup point routing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-neutral-300">
              <QrCode className="h-3.5 w-3.5 text-[#629b5c]" />
            </div>
            <span>Contactless token verification</span>
          </div>
        </div>
      </div>
    </div>
  );
}

