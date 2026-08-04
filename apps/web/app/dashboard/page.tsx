'use client';
import { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import ToastContainer, { toast } from '../components/Toast';
import { StatCardSkeleton, ChartSkeleton, DeptCardSkeleton } from '../components/LoadingSkeleton';
import { stressColor } from '../components/StressGauge';
import {
  getDashboardAggregate,
  getDashboardStats,
  getDashboardPredictions,
  getDashboardTrend,
  getMLHealth,
  getDashboardInsights,
  type AggregateItem,
  type StatsResponse,
  type PredictionsResponse,
  type TrendPoint,
  type MLHealthResponse,
  type InsightsResponse,
} from '../lib/api';

interface DashboardData {
  stats: StatsResponse | null;
  aggregate: AggregateItem[];
  predictions: PredictionsResponse | null;
  trend: TrendPoint[];
  mlHealth: MLHealthResponse | null;
  insights: InsightsResponse | null;
}

function StatCard({
  label, value, sub, icon, accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-5 shadow-sm border border-[var(--color-surface-variant)] flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-[var(--color-on-surface-variant)]">{label}</p>
        <span className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center text-white"
          style={{ backgroundColor: accent ?? 'var(--color-primary)' }}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold text-[var(--color-on-surface)] tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// horizontal bar for stress level distribution
function DistributionBar({ level, count, maxCount }: { level: number; count: number; maxCount: number }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const color = stressColor(level);
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 text-xs font-semibold text-right tabular-nums text-[var(--color-on-surface-variant)] shrink-0">
        {level}
      </span>
      <div className="flex-1 h-7 bg-[var(--color-surface-variant)] rounded-[var(--radius-xs)] overflow-hidden">
        <div
          className="h-full rounded-[var(--radius-xs)] transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color, minWidth: count > 0 ? '6px' : '0px' }}
          role="presentation"
        />
      </div>
      <span className="w-10 text-xs tabular-nums text-[var(--color-on-surface-variant)] shrink-0 text-right">
        {count}
      </span>
    </div>
  );
}

// inline SVG sparkline for trend data — no chart library needed
function TrendSparkline({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) return <EmptyState message="Not enough trend data yet." />;

  const W = 400, H = 80, PAD = 8;
  const values = data.map(d => d.avg_stress);
  const min = Math.min(...values);
  const max = Math.max(...values, min + 0.1); // avoid division by zero
  const xStep = (W - PAD * 2) / (data.length - 1);

  const pts = data.map((d, i) => {
    const x = PAD + i * xStep;
    const y = PAD + (1 - (d.avg_stress - min) / (max - min)) * (H - PAD * 2);
    return { x, y, d };
  });

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${path} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L ${PAD} ${H} Z`;

  const latest = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const trending = latest.d.avg_stress > prev.d.avg_stress ? 'up' : latest.d.avg_stress < prev.d.avg_stress ? 'down' : 'flat';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--color-on-surface-variant)]">
          {data[0]?.day} → {data[data.length - 1]?.day}
        </span>
        <span className={`text-xs font-medium flex items-center gap-1 ${
          trending === 'up' ? 'text-red-500' : trending === 'down' ? 'text-emerald-500' : 'text-[var(--color-on-surface-variant)]'
        }`}>
          {trending === 'up' ? '↑ Rising' : trending === 'down' ? '↓ Falling' : '→ Stable'}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20 overflow-visible">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* area fill */}
        <path d={area} fill="url(#sparkGrad)" />
        {/* trend line */}
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* data point dots */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="var(--color-primary)" />
            <title>{p.d.day}: {p.d.avg_stress} avg · {p.d.count} submissions</title>
          </g>
        ))}
      </svg>
      {/* day labels */}
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-[var(--color-on-surface-variant)] tabular-nums">
            {d.day.slice(5)} {/* show MM-DD */}
          </span>
        ))}
      </div>
    </div>
  );
}

// ML model health badge shown in dashboard header
function MLHealthBadge({ health }: { health: MLHealthResponse | null }) {
  if (!health) return null;
  const isLive = health.is_production_model;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-full)] text-xs font-medium border ${
        isLive
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
          : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
      }`}
      title={`Model cache age: ${health.cache_age_seconds}s`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {isLive ? 'Production Model' : 'Baseline Model'}
    </span>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  Low:    '#22c55e',
  Medium: '#f59e0b',
  High:   '#ef4444',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    stats: null, aggregate: [], predictions: null,
    trend: [], mlHealth: null, insights: null,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [trendDays, setTrendDays] = useState(7);

  const load = useCallback(async (silent = false, days = trendDays) => {
    if (!silent) setLoading(true);
    try {
      const [statsRes, aggRes, predRes, trendRes, mlRes, insightsRes] = await Promise.allSettled([
        getDashboardStats(),
        getDashboardAggregate(),
        getDashboardPredictions(),
        getDashboardTrend(days),
        getMLHealth(),
        getDashboardInsights(),
      ]);

      setData({
        stats:       statsRes.status === 'fulfilled'    ? statsRes.value        : null,
        aggregate:   aggRes.status === 'fulfilled'      ? aggRes.value.data     : [],
        predictions: predRes.status === 'fulfilled'     ? predRes.value         : null,
        trend:       trendRes.status === 'fulfilled'    ? trendRes.value.data   : [],
        mlHealth:    mlRes.status === 'fulfilled'       ? mlRes.value           : null,
        insights:    insightsRes.status === 'fulfilled' ? insightsRes.value     : null,
      });
      setLastUpdated(new Date());
    } catch {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [trendDays]);

  useEffect(() => { load(); }, [load]);

  // auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => load(true), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const stats = data.stats;
  const distribution = Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    count: stats?.distribution?.[i + 1] ?? 0,
  }));
  const maxDist = Math.max(...distribution.map(d => d.count), 1);

  const predEntries = Object.entries(data.predictions?.data ?? {});
  const predTotal = predEntries.reduce((s, [, v]) => s + v, 0);

  // valence display: -1 (very negative) to +1 (positive)
  const valenceLabel = (v: number | null | undefined) => {
    if (v == null) return '—';
    if (v > 0.2) return '😊 Positive';
    if (v < -0.2) return '😔 Negative';
    return '😐 Neutral';
  };

  return (
    <>
      <Navbar currentPath="dashboard" />
      <ToastContainer />

      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto">

          {/* header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-on-surface)]">
                  Staff Dashboard
                </h1>
                <MLHealthBadge health={data.mlHealth} />
              </div>
              {lastUpdated && (
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={() => load()}
              disabled={loading}
              aria-label="Refresh dashboard data"
              className="
                flex items-center gap-2 px-4 py-2 rounded-[var(--radius-full)]
                border border-[var(--color-outline)] text-sm font-medium
                text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)]
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-start sm:self-auto
              "
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={loading ? 'animate-spin' : ''}
              >
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M3 8v4l4-4M21 16v-4l-4 4"/>
              </svg>
              Refresh
            </button>
          </div>

          {/* privacy notice */}
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] text-sm mb-8 animate-fade-in"
            role="note"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>
              <strong>k-Anonymity enforced.</strong> Only groups with ≥5 submissions are shown.
              Individual responses are never exposed.
            </p>
          </div>

          {/* stats grid */}
          <section aria-labelledby="stats-heading" className="mb-8">
            <h2 id="stats-heading" className="sr-only">Overview statistics</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
              ) : (
                <>
                  <StatCard
                    label="Total Submissions"
                    value={stats?.total_checkins ?? '—'}
                    sub="all time"
                    accent="var(--color-primary)"
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/>
                      </svg>
                    }
                  />
                  <StatCard
                    label="Avg Stress Level"
                    value={stats?.avg_stress != null ? stats.avg_stress.toFixed(1) : '—'}
                    sub="out of 10"
                    accent="#f59e0b"
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    }
                  />
                  <StatCard
                    label="High-Stress Alerts"
                    value={stats?.high_stress_count ?? '—'}
                    sub="stress level > 7"
                    accent="#ef4444"
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" strokeLinecap="round"/>
                        <path d="M12 9v4M12 17h.01" strokeLinecap="round"/>
                      </svg>
                    }
                  />
                  <StatCard
                    label="Mood Sentiment"
                    value={valenceLabel(stats?.avg_valence)}
                    sub={stats?.avg_valence != null ? `score: ${stats.avg_valence.toFixed(2)}` : 'no data yet'}
                    accent="#8b5cf6"
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round"/>
                        <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" strokeWidth="3"/>
                        <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" strokeWidth="3"/>
                      </svg>
                    }
                  />
                </>
              )}
            </div>
          </section>

          {/* insights panel */}
          {!loading && data.insights && (
            <section aria-labelledby="insights-heading" className="mb-6">
              <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 shadow-sm border border-[var(--color-surface-variant)]">
                <h2 id="insights-heading" className="font-semibold text-[var(--color-on-surface)] text-lg mb-1">
                  Live Insights
                </h2>
                <p className="text-xs text-[var(--color-on-surface-variant)] mb-5">
                  Real-time signals from anonymized check-in data
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* submission velocity */}
                  <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-variant)]">
                    <p className="text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">24h Submissions</p>
                    <p className="text-2xl font-bold tabular-nums text-[var(--color-on-surface)]">
                      {data.insights.submission_trend.last_24h}
                    </p>
                    {(() => {
                      const { last_24h, prev_24h } = data.insights!.submission_trend;
                      if (prev_24h === 0) return null;
                      const delta = last_24h - prev_24h;
                      const pct = Math.round(Math.abs(delta) / prev_24h * 100);
                      return (
                        <p className={`text-xs mt-1 ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {delta >= 0 ? `↑ +${pct}%` : `↓ -${pct}%`} vs prev 24h
                        </p>
                      );
                    })()}
                  </div>
                  {/* distress signals */}
                  <div className={`p-4 rounded-[var(--radius-lg)] ${data.insights.high_distress_signals > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-[var(--color-surface-variant)]'}`}>
                    <p className="text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">High-Distress Signals</p>
                    <p className={`text-2xl font-bold tabular-nums ${data.insights.high_distress_signals > 0 ? 'text-red-500' : 'text-[var(--color-on-surface)]'}`}>
                      {data.insights.high_distress_signals}
                    </p>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
                      stress &gt; 7 + negative mood
                    </p>
                  </div>
                  {/* top tags */}
                  <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-variant)]">
                    <p className="text-xs font-medium text-[var(--color-on-surface-variant)] mb-2">Top Mood Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {data.insights.top_tags.slice(0, 5).map(({ tag, count }) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] font-medium">
                          {tag} {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* stress distribution */}
            <section
              aria-labelledby="dist-heading"
              className="lg:col-span-2 bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 shadow-sm border border-[var(--color-surface-variant)]"
            >
              <h2 id="dist-heading" className="font-semibold text-[var(--color-on-surface)] text-lg mb-1">
                Stress Level Distribution
              </h2>
              <p className="text-xs text-[var(--color-on-surface-variant)] mb-5">
                Number of submissions per stress level (1–10)
              </p>
              {loading ? (
                <ChartSkeleton />
              ) : (
                <div className="flex flex-col gap-2" role="list" aria-label="Stress level distribution">
                  {distribution.map(({ level, count }) => (
                    <div key={level} role="listitem">
                      <DistributionBar level={level} count={count} maxCount={maxDist} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ML prediction categories */}
            <section
              aria-labelledby="cat-heading"
              className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 shadow-sm border border-[var(--color-surface-variant)]"
            >
              <h2 id="cat-heading" className="font-semibold text-[var(--color-on-surface)] text-lg mb-1">
                ML Categories
              </h2>
              <p className="text-xs text-[var(--color-on-surface-variant)] mb-5">
                AI-predicted stress categories
              </p>
              {loading ? (
                <div className="flex flex-col gap-3">
                  {[70, 45, 30].map((w, i) => (
                    <div key={i} className="h-16 bg-[var(--color-surface-variant)] rounded-[var(--radius-md)] animate-pulse" style={{ opacity: 1 - i * 0.25 }} />
                  ))}
                </div>
              ) : predEntries.length === 0 ? (
                <EmptyState message="No ML predictions yet." />
              ) : (
                <div className="flex flex-col gap-4">
                  {predEntries.map(([cat, count]) => {
                    const pct = predTotal > 0 ? Math.round((count / predTotal) * 100) : 0;
                    const color = CATEGORY_COLORS[cat] ?? 'var(--color-primary)';
                    const conf = data.predictions?.avg_confidence?.[cat];
                    return (
                      <div key={cat} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium" style={{ color }}>{cat}</span>
                          <div className="text-right">
                            <span className="text-xs tabular-nums text-[var(--color-on-surface-variant)]">
                              {count} ({pct}%)
                            </span>
                            {conf != null && (
                              <span className="block text-[10px] text-[var(--color-on-surface-variant)] opacity-70">
                                {(conf * 100).toFixed(0)}% confidence
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-2 bg-[var(--color-surface-variant)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* trend chart */}
          <section aria-labelledby="trend-heading" className="mb-6">
            <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 shadow-sm border border-[var(--color-surface-variant)]">
              <div className="flex items-center justify-between mb-1">
                <h2 id="trend-heading" className="font-semibold text-[var(--color-on-surface)] text-lg">
                  Stress Trend
                </h2>
                {/* day-range picker */}
                <div className="flex gap-1" role="group" aria-label="Trend time range">
                  {[7, 14, 30].map(d => (
                    <button
                      key={d}
                      onClick={() => { setTrendDays(d); load(true, d); }}
                      aria-pressed={trendDays === d}
                      className={`px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${
                        trendDays === d
                          ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                          : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)]'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)] mb-5">
                Average daily stress over last {trendDays} days
              </p>
              {loading ? <ChartSkeleton /> : <TrendSparkline data={data.trend} />}
            </div>
          </section>

          {/* dept heatmap */}
          <section aria-labelledby="dept-heading" className="mb-6">
            <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 shadow-sm border border-[var(--color-surface-variant)]">
              <h2 id="dept-heading" className="font-semibold text-[var(--color-on-surface)] text-lg mb-1">
                Department Stress Heatmap
              </h2>
              <p className="text-xs text-[var(--color-on-surface-variant)] mb-5">
                k-anonymized — only groups with ≥5 submissions shown. Dept. IDs are hashed for privacy.
              </p>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => <DeptCardSkeleton key={i} />)}
                </div>
              ) : data.aggregate.length === 0 ? (
                <EmptyState message="No department data meets the anonymity threshold yet. More submissions needed." />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {data.aggregate.map((item, i) => {
                    const avgStress = item.avg_stress ?? 0;
                    const color = stressColor(Math.round(avgStress));
                    const deptLabel = item.dept_hash
                      ? item.dept_hash.substring(0, 8) + '…'
                      : 'Unknown';
                    return (
                      <div
                        key={i}
                        className="relative p-4 rounded-[var(--radius-lg)] border overflow-hidden"
                        style={{ borderColor: color + '40', backgroundColor: color + '10' }}
                        aria-label={`Department ${deptLabel}, average stress ${avgStress.toFixed(1)}, ${item.count} submissions`}
                      >
                        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[var(--radius-lg)]" style={{ backgroundColor: color }} />
                        <p className="text-xs text-[var(--color-on-surface-variant)] font-mono mb-2 mt-1 truncate">
                          {deptLabel}
                        </p>
                        <p className="text-2xl font-bold tabular-nums" style={{ color }}>
                          {avgStress.toFixed(1)}
                        </p>
                        <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                          avg stress · {item.count} submissions
                        </p>
                        {/* valence indicator */}
                        {item.avg_valence != null && (
                          <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-1 opacity-70">
                            mood: {item.avg_valence > 0.1 ? '😊' : item.avg_valence < -0.1 ? '😔' : '😐'} {item.avg_valence.toFixed(2)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

        </div>
      </main>
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-2" aria-live="polite">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-outline)]">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
      </svg>
      <p className="text-sm text-[var(--color-on-surface-variant)]">{message}</p>
    </div>
  );
}
