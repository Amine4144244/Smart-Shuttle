import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatDate, getStatusColor } from '@/lib/utils';
import {
  CalendarDays,
  Users,
  Truck,
  Bus,
  Activity,
  CheckCircle2,
  Clock,
  Hourglass,
  UserCheck,
  UserX,
  Radio,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  Navigation,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#10b981',
  CHECKED_IN: '#059669',
  PENDING: '#f59e0b',
  CANCELLED: '#64748b',
  REJECTED: '#ef4444',
  COMPLETED: '#8b5cf6',
};

const PIE_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => dashboardApi.getAdmin().then((r) => r.data),
    refetchInterval: 15000, // Live poll every 15s for active fleet updates
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <div className="h-10 w-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono font-medium text-muted-foreground animate-pulse">
          Connecting to Dispatch Command Telemetry...
        </p>
      </div>
    );
  }

  const stats = data?.overview || {};
  const pieData = data?.reservationsByStatus?.map((s: any) => ({
    name: s.status,
    value: s._count,
    color: STATUS_COLORS[s.status] || '#3b82f6',
  })) || [];
  const barData = data?.reservationsByMonth || [];
  const boarding = data?.activeBoarding;
  const recentReservations = data?.recentReservations || [];
  const upcomingEvents = data?.upcomingEvents || [];

  const totalBookingsCount = pieData.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0);

  return (
    <div className="space-y-7 pb-10">
      {/* 1. Command Header Bar (21st.dev Style) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-sans">
              Operations & Dispatch Command
            </h1>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>LIVE TELEMETRY</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Real-time fleet dispatch, reservation verification, and transit capacity analytics.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 gap-1.5 rounded-xl border-border/80 bg-card hover:bg-muted/80 text-xs font-semibold shadow-sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin text-primary' : ''}`} />
            <span>Sync</span>
          </Button>

          <Button
            size="sm"
            className="h-9 px-4 gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:opacity-95 text-white text-xs font-semibold shadow-md shadow-primary/25 transition-all hover:scale-[1.02]"
            onClick={() => navigate('/admin/active-shuttles')}
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Monitor Live Fleet</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Telemetry Bento Grid: Key Operations KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Total Events */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-card via-card/90 to-card/60 border border-border/80 hover:border-blue-500/40 hover:shadow-lg transition-all duration-300 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Total Events
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold font-mono text-foreground font-tabular">
              {stats.totalEvents || 0}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              <span className="text-blue-600 dark:text-blue-400 font-semibold font-mono">Managed</span>
              <span>across all event venues</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Participants */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-card via-card/90 to-card/60 border border-border/80 hover:border-emerald-500/40 hover:shadow-lg transition-all duration-300 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Registered Passengers
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold font-mono text-foreground font-tabular">
              {stats.totalParticipants || 0}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                {stats.checkedInReservations || 0} checked-in
              </span>
              <span>to date</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Fleet & Drivers */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-card via-card/90 to-card/60 border border-border/80 hover:border-purple-500/40 hover:shadow-lg transition-all duration-300 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Active Fleet & Drivers
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Bus className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-3xl font-extrabold text-foreground font-tabular">
                {stats.totalVehicles || 0}
              </span>
              <span className="text-xs text-muted-foreground font-medium">buses /</span>
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400 font-tabular">
                {stats.totalDrivers || 0}
              </span>
              <span className="text-xs text-muted-foreground font-medium">captains</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              <span className="text-purple-600 dark:text-purple-400 font-semibold font-mono">Verified</span>
              <span>telemetry units</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Operations & Active Trips */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-card via-card/90 to-card/60 border border-border/80 hover:border-primary/40 hover:shadow-lg transition-all duration-300 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Live Trips / Operations
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/20">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-tabular">
                {stats.activeTrips || 0}
              </span>
              <span className="text-xs text-muted-foreground font-medium">live now •</span>
              <span className="text-lg font-bold text-foreground font-tabular">
                {stats.todayTrips || 0}
              </span>
              <span className="text-xs text-muted-foreground font-medium">today</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                {stats.completedTrips || 0} completed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Secondary Metrics Pill Strip: Reservation Status Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/80 shadow-sm hover:border-yellow-500/40 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-yellow-500/10 text-yellow-600 flex items-center justify-center font-bold text-xs">
              <Hourglass className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Pending</span>
          </div>
          <span className="font-mono font-bold text-base text-yellow-600 dark:text-yellow-400 font-tabular">
            {stats.pendingReservations || 0}
          </span>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/80 shadow-sm hover:border-blue-500/40 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Confirmed</span>
          </div>
          <span className="font-mono font-bold text-base text-blue-600 dark:text-blue-400 font-tabular">
            {stats.confirmedReservations || 0}
          </span>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/80 shadow-sm hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
              <UserCheck className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Checked-in</span>
          </div>
          <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400 font-tabular">
            {stats.checkedInReservations || 0}
          </span>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/80 shadow-sm hover:border-red-500/40 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-xs">
              <UserX className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Rejected / Cancelled</span>
          </div>
          <span className="font-mono font-bold text-base text-red-600 dark:text-red-400 font-tabular">
            {(stats.rejectedReservations || 0) + (stats.cancelledReservations || 0)}
          </span>
        </div>
      </div>

      {/* 4. Active Boarding & Transit Gate HUD (21st.dev Border Beam Container) */}
      {boarding && (
        <div className="border-beam rounded-3xl border border-border/90 bg-gradient-to-br from-card via-card/90 to-primary/[0.08] dark:from-card dark:via-card/95 dark:to-primary/15 shadow-xl p-6 sm:p-7 relative overflow-hidden">
          <div className="relative z-10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                  <Bus className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Live Gate Boarding
                    </span>
                    <Badge variant="live" className="text-[10px] font-mono">
                      BUS {boarding.busNumber}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mt-0.5">
                    {boarding.eventName || 'Event Transit Express'}
                  </h3>
                </div>
              </div>

              <Button
                size="sm"
                className="h-9 px-4 gap-2 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-white shadow-md shadow-primary/25"
                onClick={() => navigate('/admin/active-shuttles')}
              >
                <Navigation className="h-3.5 w-3.5" /> View Live Shuttle Radar
              </Button>
            </div>

            {/* Boarding Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[10px] uppercase font-mono text-muted-foreground block">Assigned Route</span>
                <span className="font-bold text-foreground text-sm truncate block mt-0.5">
                  {boarding.routeName || 'Direct Route'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[10px] uppercase font-mono text-muted-foreground block">Bus Capacity</span>
                <span className="font-mono font-bold text-foreground text-sm mt-0.5 block">
                  {boarding.capacity} Seats
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[10px] uppercase font-mono text-muted-foreground block">Checked-in</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 block">
                  {boarding.checkedIn} / {boarding.capacity}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[10px] uppercase font-mono text-muted-foreground block">Seats Remaining</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm mt-0.5 block">
                  {boarding.remaining} Seats
                </span>
              </div>
            </div>

            {/* Progress Bar Gauge */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Gate Boarding Verification
                </span>
                <span className="font-bold text-foreground font-tabular">{boarding.progress}% Filled</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden border border-border/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-blue-600 transition-all duration-700"
                  style={{ width: `${boarding.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. 21st.dev Analytics Bento: Charts & Visual Intelligence */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Chart: Monthly Passenger Demand (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Monthly Passenger Demand
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total passenger reservations processed over the past 12 months.
              </p>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg">
              AGGREGATE LOGS
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Array.isArray(barData) && barData.length > 0 ? barData : [{ month: 'Current', count: stats.totalReservations || 0 }]}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'monospace' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontFamily: 'monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                  cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                />
                <Bar
                  dataKey="count"
                  name="Reservations"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Status Distribution Donut (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="border-b border-border/50 pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" /> Status Distribution
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live breakdown of all booking statuses.
            </p>
          </div>

          {pieData.length > 0 ? (
            <div className="space-y-4">
              <div className="h-44 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || PIE_PALETTE[index % PIE_PALETTE.length]}
                          stroke="hsl(var(--card))"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Total Readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs uppercase font-mono font-bold text-muted-foreground">Total</span>
                  <span className="text-xl font-extrabold font-mono text-foreground font-tabular">
                    {totalBookingsCount}
                  </span>
                </div>
              </div>

              {/* Status Pills */}
              <div className="space-y-2 pt-1">
                {pieData.map((entry: any, index: number) => {
                  const pct = totalBookingsCount > 0 ? Math.round((entry.value / totalBookingsCount) * 100) : 0;
                  return (
                    <div key={entry.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: entry.color || PIE_PALETTE[index % PIE_PALETTE.length] }}
                        />
                        <span className="font-medium text-foreground">
                          {entry.name ? String(entry.name).replace('_', ' ') : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-foreground font-tabular">{entry.value}</span>
                        <span className="text-muted-foreground text-[10px]">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Layers className="h-8 w-8 opacity-30 mb-1" />
              <p className="text-xs">No status distribution records</p>
            </div>
          )}
        </div>
      </div>

      {/* 6. Dual Stream Bento: Recent Reservations & Upcoming Events */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Recent Reservations Live Feed */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Recent Passenger Bookings</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time stream of incoming attendee seat reservations.
              </p>
            </div>
            <Link
              to="/admin/reservations"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-border/50">
            {recentReservations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No recent bookings recorded.</p>
            ) : (
              recentReservations.map((r: any) => {
                const initials = `${r.participant?.firstName?.[0] || ''}${r.participant?.lastName?.[0] || ''}`.toUpperCase() || 'PA';
                return (
                  <div key={r.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {r.participant?.firstName} {r.participant?.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {r.event?.name || 'Event Shuttle'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <Badge className={getStatusColor(r.status)}>
                        {r.status}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Upcoming Events Dispatch */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Upcoming Transit Events</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scheduled summits, conferences, and event shuttle deployments.
              </p>
            </div>
            <Link
              to="/admin/events"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Manage Events <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-border/50">
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No upcoming events scheduled.</p>
            ) : (
              upcomingEvents.map((e: any) => {
                const eventDate = new Date(e.date);
                const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                const day = eventDate.getDate();

                return (
                  <div key={e.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 text-primary flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-mono font-bold leading-none">{month}</span>
                        <span className="text-sm font-bold font-mono leading-none mt-0.5">{day}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{e.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {formatDate(e.date)} • {e._count?.reservations || 0} bookings
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={getStatusColor(e.status)}>
                        {e.status}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
