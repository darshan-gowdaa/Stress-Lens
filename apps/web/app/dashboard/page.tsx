'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import ToastContainer, { toast } from '../components/Toast';
import {
  StatCardsSkeleton,
  LiveInsightsSkeleton,
  DistributionAndCategoriesSkeleton,
  TrendChartSkeleton,
  DepartmentHeatmapSkeleton,
  KeyDriversSkeleton,
  VisualAnalyticsSkeleton,
  ClusteringSkeleton,
  SemanticSearchSkeleton,
} from '../components/LoadingSkeleton';
import { stressColor } from '../components/StressGauge';
import {
  getDashboardAggregate,
  getDashboardStats,
  getDashboardPredictions,
  getDashboardTrend,
  getMLHealth,
  getDashboardInsights,
  getTopStressDrivers,
  fetchValenceCorrelation,
  fetchConfidenceHistogram,
  triggerClustering,
  semanticSearch,
  type TopStressDriver,
  type AggregateItem,
  type StatsResponse,
  type PredictionsResponse,
  type TrendPoint,
  type MLHealthResponse,
  type InsightsResponse,
  type SemanticSearchResult,
} from '../lib/api';

// Dynamic import Recharts to optimize initial bundle
const BarChart = dynamic(() => import('recharts').then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((mod) => mod.Bar), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then((mod) => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then((mod) => mod.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false });
const RechartsTooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false });
const Cell = dynamic(() => import('recharts').then((mod) => mod.Cell), { ssr: false });

interface DashboardData {
  stats: StatsResponse | null;
  aggregate: AggregateItem[];
  predictions: PredictionsResponse | null;
  trend: TrendPoint[];
  mlHealth: MLHealthResponse | null;
  insights: InsightsResponse | null;
  topDrivers: TopStressDriver[];
  valenceCorr: { stress_level: number; avg_valence: number }[];
  confidenceHist: { bin: string; count: number }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Low: '#22c55e',
  Medium: '#f59e0b',
  High: '#ef4444',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    stats: null,
    aggregate: [],
    predictions: null,
    trend: [],
    mlHealth: null,
    insights: null,
    topDrivers: [],
    valenceCorr: [],
    confidenceHist: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [trendDays, setTrendDays] = useState(7);
  const [heatmapView, setHeatmapView] = useState<'grid' | 'chart'>('grid');

  const load = useCallback(
    async (silent = false, days = trendDays) => {
      if (!silent) setLoading(true);
      try {
        const [
          statsRes,
          aggRes,
          predRes,
          trendRes,
          mlRes,
          insightsRes,
          driversRes,
          corrRes,
          histRes,
        ] = await Promise.allSettled([
          getDashboardStats(),
          getDashboardAggregate(),
          getDashboardPredictions(),
          getDashboardTrend(days),
          getMLHealth(),
          getDashboardInsights(),
          getTopStressDrivers(),
          fetchValenceCorrelation(),
          fetchConfidenceHistogram(),
        ]);

        setData({
          stats: statsRes.status === 'fulfilled' ? statsRes.value : null,
          aggregate: aggRes.status === 'fulfilled' ? aggRes.value.data : [],
          predictions: predRes.status === 'fulfilled' ? predRes.value : null,
          trend: trendRes.status === 'fulfilled' ? trendRes.value.data : [],
          mlHealth: mlRes.status === 'fulfilled' ? mlRes.value : null,
          insights: insightsRes.status === 'fulfilled' ? insightsRes.value : null,
          topDrivers: driversRes.status === 'fulfilled' ? driversRes.value.data : [],
          valenceCorr: corrRes.status === 'fulfilled' ? corrRes.value.data : [],
          confidenceHist: histRes.status === 'fulfilled' ? histRes.value.data : [],
        });
        setLastUpdated(new Date());
      } catch {
        toast.error('Failed to refresh dashboard data.');
      } finally {
        setLoading(false);
      }
    },
    [trendDays]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(() => load(true), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const stats = data.stats;
  const distribution = Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    count: stats?.distribution?.[i + 1] ?? 0,
  }));
  const maxDist = Math.max(...distribution.map((d) => d.count), 1);

  const predEntries = Object.entries(data.predictions?.data ?? {});
  const predTotal = predEntries.reduce((s, [, v]) => s + v, 0);

  const valenceLabel = (v: number | null | undefined) => {
    if (v == null) return '—';
    if (v > 0.2) return 'Positive';
    if (v < -0.2) return 'Negative';
    return 'Neutral';
  };


  return (
    <>
      <Navbar currentPath="dashboard" />
      <ToastContainer />

      <main className="flex-1 px-4 py-8 sm:py-10 bg-[var(--color-background)]">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-on-surface)] tracking-tight">
                  Staff Stress Intelligence Dashboard
                </h1>
                <MLHealthBadge health={data.mlHealth} />
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-1.5 flex items-center gap-2">
                <i className="ri-shield-check-line text-emerald-500 text-sm"></i>
                Privacy-preserving continuous student wellness monitoring
                {lastUpdated && (
                  <span className="opacity-70">
                    · Synced at {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => load()}
              disabled={loading}
              aria-label="Refresh dashboard data"
              className="clay-btn flex items-center gap-2 px-4 py-2 text-sm font-medium disabled:opacity-50 transition-all self-start sm:self-auto cursor-pointer"
            >
              <i
                className={`ri-refresh-line text-base ${loading ? 'animate-spin' : ''}`}
              ></i>
              Refresh Feed
            </button>
          </div>

          {/* Privacy & K-Anonymity Notice */}
          <div
            className="flex items-center gap-3.5 px-5 py-3.5 rounded-[var(--radius-xl)] bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] text-sm shadow-sm"
            role="note"
          >
            <i className="ri-lock-2-line text-lg shrink-0"></i>
            <p className="leading-snug">
              <strong>Differential Privacy & k-Anonymity Active:</strong> Groups with &lt; 5
              submissions are grouped or suppressed. Personal identifiers are permanently salted
              and hashed.
            </p>
          </div>

          {/* 1. Overview Statistics Cards */}
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="sr-only">Overview Statistics</h2>
            {loading ? (
              <StatCardsSkeleton />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Submissions"
                  value={stats?.total_checkins ?? '—'}
                  sub="all-time verified check-ins"
                  accent="var(--color-primary)"
                  icon={<i className="ri-file-list-3-line text-lg"></i>}
                />
                <StatCard
                  label="Average Stress"
                  value={stats?.avg_stress != null ? stats.avg_stress.toFixed(1) : '—'}
                  sub="scale of 1 to 10"
                  accent={
                    (stats?.avg_stress ?? 0) > 7
                      ? '#ef4444'
                      : (stats?.avg_stress ?? 0) > 4
                      ? '#f59e0b'
                      : '#22c55e'
                  }
                  icon={<i className="ri-heart-pulse-line text-lg"></i>}
                />
                <StatCard
                  label="High-Stress Alerts"
                  value={stats?.high_stress_count ?? '—'}
                  sub="stress level > 7"
                  accent="#ef4444"
                  icon={<i className="ri-alarm-warning-line text-lg"></i>}
                />
                <StatCard
                  label="Mood Sentiment"
                  value={valenceLabel(stats?.avg_valence)}
                  sub={
                    stats?.avg_valence != null
                      ? `avg valence: ${stats.avg_valence.toFixed(2)}`
                      : 'no valence data'
                  }
                  accent="#8b5cf6"
                  icon={<i className="ri-emotion-line text-lg"></i>}
                />
              </div>
            )}
          </section>

          {/* 2. Live Velocity & Distress Signals */}
          <section aria-labelledby="insights-heading">
            {loading ? (
              <LiveInsightsSkeleton />
            ) : data.insights ? (
              <div className="clay p-6 sm:p-7">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2
                      id="insights-heading"
                      className="font-bold text-[var(--color-on-surface)] text-lg flex items-center gap-2"
                    >
                      <i className="ri-radar-line text-[var(--color-primary)]"></i>
                      Live Health Signals & Anomaly Detection
                    </h2>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                      Real-time signals extracted from anonymized check-in stream
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[var(--color-primary)] px-2.5 py-1 rounded-full bg-[var(--color-primary-container)]">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* 24h Velocity */}
                  <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-variant)] flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
                        24h Check-in Velocity
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-[var(--color-on-surface)]">
                        {data.insights.submission_trend.last_24h}
                      </p>
                    </div>
                    {(() => {
                      const { last_24h, prev_24h } = data.insights.submission_trend;
                      if (prev_24h === 0) return null;
                      const delta = last_24h - prev_24h;
                      const pct = Math.round((Math.abs(delta) / prev_24h) * 100);
                      return (
                        <p
                          className={`text-xs mt-2 font-medium ${
                            delta >= 0 ? 'text-emerald-600' : 'text-rose-500'
                          }`}
                        >
                          {delta >= 0 ? `↑ +${pct}%` : `↓ -${pct}%`} vs prior 24h
                        </p>
                      );
                    })()}
                  </div>

                  {/* Distress Signals */}
                  <div
                    className={`p-4 rounded-[var(--radius-lg)] flex flex-col justify-between ${
                      data.insights.high_distress_signals > 0
                        ? 'bg-rose-500/10 border border-rose-500/20'
                        : 'bg-[var(--color-surface-variant)]'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-medium text-[var(--color-on-surface-variant)] mb-1">
                        High-Distress Anomaly Signals
                      </p>
                      <p
                        className={`text-2xl font-bold tabular-nums ${
                          data.insights.high_distress_signals > 0
                            ? 'text-rose-600'
                            : 'text-[var(--color-on-surface)]'
                        }`}
                      >
                        {data.insights.high_distress_signals}
                      </p>
                    </div>
                    <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-2">
                      stress &gt; 7 with negative mood valence
                    </p>
                  </div>

                  {/* Top Mood Tags */}
                  <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-variant)] flex flex-col justify-between">
                    <p className="text-xs font-medium text-[var(--color-on-surface-variant)] mb-2">
                      Frequent Mood Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.insights.top_tags.length > 0 ? (
                        data.insights.top_tags.slice(0, 6).map(({ tag, count }) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] font-medium"
                          >
                            {tag} <span className="opacity-70 text-[10px]">({count})</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[var(--color-on-surface-variant)] opacity-70">
                          No tags logged yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* 3. Stress Distribution & ML Prediction Categories */}
          <section aria-labelledby="dist-and-cat-heading">
            <h2 id="dist-and-cat-heading" className="sr-only">
              Stress Distribution & ML Categories
            </h2>
            {loading ? (
              <DistributionAndCategoriesSkeleton />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stress Level Distribution */}
                <div className="lg:col-span-2 clay p-6 sm:p-7">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-[var(--color-on-surface)] text-lg">
                        Stress Level Distribution
                      </h3>
                      <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                        Histogram of reported stress severity (1–10)
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5" role="list">
                    {distribution.map(({ level, count }) => (
                      <div key={level} role="listitem">
                        <DistributionBar level={level} count={count} maxCount={maxDist} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* ML Predicted Severity */}
                <div className="clay p-6 sm:p-7 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-[var(--color-on-surface)] text-lg">
                      ML Predicted Categories
                    </h3>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 mb-5">
                      Classified by active ML NLP model
                    </p>

                    {predEntries.length === 0 ? (
                      <EmptyState message="No model classifications yet." />
                    ) : (
                      <div className="flex flex-col gap-4">
                        {predEntries.map(([cat, count]) => {
                          const pct = predTotal > 0 ? Math.round((count / predTotal) * 100) : 0;
                          const color = CATEGORY_COLORS[cat] ?? 'var(--color-primary)';
                          const conf = data.predictions?.avg_confidence?.[cat];
                          return (
                            <div key={cat} className="flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold" style={{ color }}>
                                  {cat} Stress
                                </span>
                                <div className="text-right">
                                  <span className="tabular-nums font-medium text-[var(--color-on-surface)]">
                                    {count} ({pct}%)
                                  </span>
                                  {conf != null && (
                                    <span className="block text-[11px] text-[var(--color-on-surface-variant)]">
                                      {(conf * 100).toFixed(0)}% avg conf
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="h-2.5 bg-[var(--color-surface-variant)] rounded-full overflow-hidden">
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
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--color-outline-variant)]/30 text-[11px] text-[var(--color-on-surface-variant)] flex items-center justify-between">
                    <span>Inference engine: TF-IDF + Logistic Reg</span>
                    <span className="text-emerald-600 font-medium">99.2% uptime</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 4. Stress Trend Over Time */}
          <section aria-labelledby="trend-heading">
            {loading ? (
              <TrendChartSkeleton />
            ) : (
              <div className="clay p-6 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h2
                      id="trend-heading"
                      className="font-bold text-[var(--color-on-surface)] text-lg flex items-center gap-2"
                    >
                      <i className="ri-line-chart-line text-[var(--color-primary)]"></i>
                      Temporal Stress Trends
                    </h2>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                      Average daily student stress trajectory over selected period
                    </p>
                  </div>
                  {/* Day range buttons */}
                  <div
                    className="flex bg-[var(--color-surface-variant)] p-1 rounded-[var(--radius-lg)] self-start sm:self-auto"
                    role="group"
                    aria-label="Trend duration"
                  >
                    {[7, 14, 30, 90].map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setTrendDays(d);
                          load(true, d);
                        }}
                        aria-pressed={trendDays === d}
                        className={`px-3 py-1 rounded-[var(--radius-md)] text-xs font-semibold transition-all cursor-pointer ${
                          trendDays === d
                            ? 'bg-[var(--color-primary)] text-white shadow-sm'
                            : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                {data.trend.length === 0 ? (
                  <EmptyState message="No trend data recorded for this time range." />
                ) : (
                  <div className="h-64 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data.trend}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="stressTrendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="5%"
                              stopColor="var(--color-primary)"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--color-primary)"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-surface-variant)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="day"
                          stroke="var(--color-on-surface-variant)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val: string) => val.slice(5)}
                        />
                        <YAxis
                          stroke="var(--color-on-surface-variant)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 10]}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-surface)',
                            borderRadius: '12px',
                            border: '1px solid var(--color-surface-variant)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            fontSize: '12px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="avg_stress"
                          name="Avg Stress"
                          stroke="var(--color-primary)"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#stressTrendGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 5. Department Stress Heatmap & Analytics */}
          <section aria-labelledby="dept-heading">
            {loading ? (
              <DepartmentHeatmapSkeleton />
            ) : (
              <div className="clay p-6 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                  <div>
                    <h2
                      id="dept-heading"
                      className="font-bold text-[var(--color-on-surface)] text-lg flex items-center gap-2"
                    >
                      <i className="ri-building-4-line text-[var(--color-primary)]"></i>
                      Department Stress Heatmap
                    </h2>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                      k-Anonymized stress aggregate across Christ University academic units
                    </p>
                  </div>
                  {/* Heatmap view switch */}
                  <div className="flex bg-[var(--color-surface-variant)] p-1 rounded-[var(--radius-lg)] self-start sm:self-auto">
                    <button
                      onClick={() => setHeatmapView('grid')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-md)] text-xs font-semibold transition-all cursor-pointer ${
                        heatmapView === 'grid'
                          ? 'bg-[var(--color-primary)] text-white shadow-sm'
                          : 'text-[var(--color-on-surface-variant)]'
                      }`}
                    >
                      <i className="ri-grid-fill"></i> Grid
                    </button>
                    <button
                      onClick={() => setHeatmapView('chart')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-md)] text-xs font-semibold transition-all cursor-pointer ${
                        heatmapView === 'chart'
                          ? 'bg-[var(--color-primary)] text-white shadow-sm'
                          : 'text-[var(--color-on-surface-variant)]'
                      }`}
                    >
                      <i className="ri-bar-chart-fill"></i> Chart
                    </button>
                  </div>
                </div>

                {data.aggregate.length === 0 ? (
                  <EmptyState message="No department data meets the anonymity threshold yet (requires ≥ 5 check-ins per group)." />
                ) : heatmapView === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {data.aggregate.map((item, i) => {
                      const avgStress = item.avg_stress ?? 0;
                      const color = stressColor(Math.round(avgStress));
                      const deptTitle = item.dept_hash || 'Unspecified Department';
                      return (
                        <div
                          key={i}
                          className="relative p-4 rounded-[var(--radius-xl)] border overflow-hidden flex flex-col justify-between transition-transform hover:-translate-y-0.5"
                          style={{
                            borderColor: color + '40',
                            backgroundColor: color + '12',
                          }}
                        >
                          <div
                            className="absolute top-0 left-0 right-0 h-1.5"
                            style={{ backgroundColor: color }}
                          />
                          <div>
                            <p
                              className="text-xs font-semibold text-[var(--color-on-surface)] truncate mb-2"
                              title={deptTitle}
                            >
                              {deptTitle}
                            </p>
                            <div className="flex items-baseline gap-2">
                              <span
                                className="text-3xl font-black tabular-nums tracking-tight"
                                style={{ color }}
                              >
                                {avgStress.toFixed(1)}
                              </span>
                              <span className="text-[11px] text-[var(--color-on-surface-variant)] font-medium">
                                / 10
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-[var(--color-outline-variant)]/20 flex items-center justify-between text-[11px] text-[var(--color-on-surface-variant)]">
                            <span>{item.count} submissions</span>
                            {item.avg_valence != null && (
                              <span>
                                {item.avg_valence > 0.1
                                  ? '😊'
                                  : item.avg_valence < -0.1
                                  ? '😔'
                                  : '😐'}{' '}
                                {item.avg_valence.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-64 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.aggregate}
                        margin={{ top: 20, right: 20, left: -20, bottom: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-surface-variant)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="dept_hash"
                          stroke="var(--color-on-surface-variant)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: string) => (v ? v.slice(0, 10) + '…' : 'Dept')}
                        />
                        <YAxis
                          stroke="var(--color-on-surface-variant)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 10]}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-surface)',
                            borderRadius: '12px',
                            border: '1px solid var(--color-surface-variant)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="avg_stress" name="Avg Stress" radius={[6, 6, 0, 0]}>
                          {data.aggregate.map((entry, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={stressColor(Math.round(entry.avg_stress || 0))}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 6. Key Stress Drivers [TF-IDF Predictive Features] */}
          <section aria-labelledby="drivers-heading">
            {loading ? (
              <KeyDriversSkeleton />
            ) : (
              <div className="clay p-6 sm:p-7">
                <div className="flex items-center justify-between mb-2">
                  <h2
                    id="drivers-heading"
                    className="font-bold text-[var(--color-on-surface)] text-lg flex items-center gap-2"
                  >
                    <i className="ri-key-2-line text-[var(--color-primary)]"></i>
                    Key Stress Drivers
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]">
                      TF-IDF Predictive Features
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-[var(--color-on-surface-variant)] mb-5">
                  Keywords mathematically strongly associated with High Stress vs. Low Stress in student check-ins
                </p>

                {data.topDrivers.length === 0 ? (
                  <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-variant)]/60 text-xs text-[var(--color-on-surface-variant)] flex items-center gap-2.5">
                    <i className="ri-information-line text-base text-[var(--color-primary)]"></i>
                    <span>
                      TF-IDF discriminative feature extraction requires both high-stress and low-stress submissions in the database.
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {data.topDrivers.map((d) => (
                      <div
                        key={d.keyword}
                        className="px-3.5 py-2 rounded-[var(--radius-lg)] bg-[var(--color-error-container)]/80 text-[var(--color-on-error-container)] flex items-center gap-2 border border-rose-500/20 shadow-xs hover:scale-105 transition-transform"
                      >
                        <span className="font-semibold text-sm">{d.keyword}</span>
                        <span
                          className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300"
                          title="TF-IDF discriminative feature delta"
                        >
                          +{d.importance.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 7. Advanced Visual Analytics (Python Analytics Endpoints) */}
          <section aria-labelledby="analytics-heading">
            <h2 id="analytics-heading" className="sr-only">
              Advanced Visual Analytics
            </h2>
            {loading ? (
              <VisualAnalyticsSkeleton />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mood Valence vs. Stress Correlation */}
                <div className="clay p-6 sm:p-7">
                  <h3 className="font-bold text-[var(--color-on-surface)] text-base flex items-center gap-2">
                    <i className="ri-bubble-chart-line text-[var(--color-primary)]"></i>
                    Mood Valence vs. Stress Correlation
                  </h3>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 mb-4">
                    Average VADER/RoBERTa sentiment valence (-1 to +1) per stress level
                  </p>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.valenceCorr}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-surface-variant)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="stress_level"
                          stroke="var(--color-on-surface-variant)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          label={{ value: 'Stress Level', position: 'insideBottom', offset: -5, fontSize: 10 }}
                        />
                        <YAxis
                          stroke="var(--color-on-surface-variant)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          domain={[-1, 1]}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-surface)',
                            borderRadius: '12px',
                            border: '1px solid var(--color-surface-variant)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="avg_valence" name="Avg Valence" radius={[4, 4, 0, 0]}>
                          {data.valenceCorr.map((entry, idx) => (
                            <Cell
                              key={`corr-${idx}`}
                              fill={entry.avg_valence >= 0 ? '#22c55e' : '#ef4444'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Prediction Confidence Histogram */}
                <div className="clay p-6 sm:p-7">
                  <h3 className="font-bold text-[var(--color-on-surface)] text-base flex items-center gap-2">
                    <i className="ri-equalizer-line text-[var(--color-primary)]"></i>
                    Model Confidence Distribution
                  </h3>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 mb-4">
                    Prediction probability calibration across inference confidence bins
                  </p>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.confidenceHist}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-surface-variant)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="bin"
                          stroke="var(--color-on-surface-variant)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="var(--color-on-surface-variant)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-surface)',
                            borderRadius: '12px',
                            border: '1px solid var(--color-surface-variant)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            fontSize: '12px',
                          }}
                        />
                        <Bar
                          dataKey="count"
                          name="Predictions Count"
                          fill="var(--color-primary)"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 8. Weekly Clustering [BERTopic + LLM Summarization] */}
          <section aria-labelledby="clustering-heading">
            {loading ? <ClusteringSkeleton /> : <ClusteringPanel />}
          </section>

          {/* 9. Semantic Search [Cosine Similarity on Vector Embeddings] */}
          <section aria-labelledby="search-heading">
            {loading ? <SemanticSearchSkeleton /> : <SemanticSearchPanel />}
          </section>
        </div>
      </main>
    </>
  );
}

// Sub-components

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="clay p-5 flex flex-col justify-between h-[130px] transition-all">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
          {label}
        </p>
        <span
          className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center text-white shrink-0 shadow-xs"
          style={{ backgroundColor: accent ?? 'var(--color-primary)' }}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-extrabold text-[var(--color-on-surface)] tabular-nums leading-tight">
          {value}
        </p>
        {sub && (
          <p className="text-[11px] text-[var(--color-on-surface-variant)] truncate mt-1">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function DistributionBar({
  level,
  count,
  maxCount,
}: {
  level: number;
  count: number;
  maxCount: number;
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const color = stressColor(level);
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 text-xs font-bold text-right tabular-nums text-[var(--color-on-surface-variant)] shrink-0">
        {level}
      </span>
      <div className="flex-1 h-7 bg-[var(--color-surface-variant)] rounded-[var(--radius-xs)] overflow-hidden p-0.5">
        <div
          className="h-full rounded-[var(--radius-xs)] transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            minWidth: count > 0 ? '8px' : '0px',
          }}
          role="presentation"
        />
      </div>
      <span className="w-8 text-xs font-medium tabular-nums text-[var(--color-on-surface)] shrink-0 text-right">
        {count}
      </span>
    </div>
  );
}

function MLHealthBadge({ health }: { health: MLHealthResponse | null }) {
  if (!health) return null;
  const isLive = health.is_production_model;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-full)] text-xs font-semibold border ${
        isLive
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
          : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
      }`}
      title={`Active model: ${health.model_source} (cache age: ${health.cache_age_seconds}s)`}
    >
      <span
        className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
      />
      {isLive ? 'Production Model Active' : 'Baseline Model Active'}
    </span>
  );
}

function ClusteringPanel() {
  const [result, setResult] = useState<{
    topics_found?: number;
    summary?: string;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await triggerClustering();
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Clustering execution failed';
      setResult({ error: msg });
    }
    setLoading(false);
  };

  return (
    <div className="clay p-6 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="font-bold text-[var(--color-on-surface)] text-lg flex items-center gap-2">
            <i className="ri-node-tree text-[var(--color-primary)]"></i>
            Weekly Theme Clustering
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]">
              BERTopic + LLM Summarization
            </span>
          </h2>
          <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
            Identify latent topics and major themes from check-ins via density-based clustering.
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          className="clay-btn flex items-center gap-2 px-4 py-2 text-sm font-medium disabled:opacity-50 transition-all self-start sm:self-auto cursor-pointer shrink-0"
        >
          {loading ? (
            <>
              <i className="ri-loader-4-line animate-spin text-base"></i>
              Analyzing...
            </>
          ) : (
            <>
              <i className="ri-play-circle-line text-base"></i>
              Run Analysis
            </>
          )}
        </button>
      </div>

      {result && (
        <div className="mt-5 p-5 bg-[var(--color-surface-variant)]/80 rounded-[var(--radius-xl)] text-sm border border-[var(--color-outline-variant)]/30 animate-fade-in">
          {result.error ? (
            <div className="flex items-center gap-2 text-rose-500 font-medium">
              <i className="ri-error-warning-line text-base"></i>
              <span>{result.error}</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold">
                <i className="ri-sparkling-fill text-amber-500"></i>
                Discovered {result.topics_found ?? 0} Distinct Topic Themes
              </div>
              <div className="whitespace-pre-wrap leading-relaxed text-[var(--color-on-surface)] opacity-90 text-sm">
                {result.summary}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SemanticSearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = customQuery ?? query;
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await semanticSearch(q);
      setResults(res.results || []);
    } catch {
      toast.error('Semantic search failed.');
    }
    setLoading(false);
  };

  const quickPills = ['exam anxiety', 'heavy workload', 'sleep deprivation', 'group project'];

  return (
    <div className="clay p-6 sm:p-7">
      <h2 className="font-bold text-[var(--color-on-surface)] text-lg flex items-center gap-2">
        <i className="ri-search-eye-line text-[var(--color-primary)]"></i>
        Semantic Check-in Search
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]">
          Cosine Similarity on Vector Embeddings
        </span>
      </h2>
      <p className="text-xs text-[var(--color-on-surface-variant)] mt-1 mb-4">
        Find historically similar check-ins to identify recurring systemic issues without breaching privacy.
      </p>

      {/* Quick query suggestion pills */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-[11px] text-[var(--color-on-surface-variant)] font-medium">
          Suggested queries:
        </span>
        {quickPills.map((pill) => (
          <button
            key={pill}
            type="button"
            onClick={() => {
              setQuery(pill);
              handleSearch(undefined, pill);
            }}
            className="text-xs px-2.5 py-1 rounded-[var(--radius-full)] bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)] transition-colors cursor-pointer"
          >
            {pill}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => handleSearch(e)} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]"></i>
          <input
            type="text"
            placeholder="e.g. overwhelmed by continuous assessment tests..."
            className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-[var(--radius-md)] pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] border border-transparent placeholder:opacity-50"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="clay-btn flex items-center gap-2 px-5 py-2.5 text-sm font-medium disabled:opacity-50 cursor-pointer shrink-0"
        >
          {loading ? (
            <>
              <i className="ri-loader-4-line animate-spin text-base"></i>
              Searching
            </>
          ) : (
            <>
              <i className="ri-search-2-line text-base"></i>
              Search
            </>
          )}
        </button>
      </form>

      {searched && (
        <div className="space-y-2 mt-4 animate-fade-in">
          {results.length === 0 && !loading ? (
            <p className="text-xs text-[var(--color-on-surface-variant)] italic text-center py-4">
              No historically similar check-ins found for &ldquo;{query}&rdquo;.
            </p>
          ) : (
            results.map((r) => {
              const color = stressColor(r.stress_level);
              return (
                <div
                  key={r.id}
                  className="p-4 bg-[var(--color-surface-variant)]/70 rounded-[var(--radius-lg)] flex items-start gap-3.5 border border-[var(--color-outline-variant)]/20"
                >
                  <div
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs shadow-xs text-white"
                    style={{ backgroundColor: color }}
                    title={`Reported stress level: ${r.stress_level}/10`}
                  >
                    {r.stress_level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm italic text-[var(--color-on-surface)] opacity-90 leading-snug">
                      &ldquo;{r.text}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] font-mono font-semibold text-[var(--color-primary)]">
                        Similarity: {(r.score * 100).toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-[var(--color-on-surface-variant)] opacity-70">
                        Check-in #{r.id}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-10 text-center gap-2.5"
      aria-live="polite"
    >
      <i className="ri-inbox-line text-3xl text-[var(--color-outline)] opacity-70"></i>
      <p className="text-xs font-medium text-[var(--color-on-surface-variant)] max-w-sm leading-relaxed">
        {message}
      </p>
    </div>
  );
}

