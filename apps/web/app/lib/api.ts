// centralized API client - all fetch calls live here, base URL from env
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CheckinPayload {
  stress_level: number;
  text: string;
  tags: string[];
  course?: string;
  dept?: string;
  sleep_hours?: number;
}

export interface CheckinResponse {
  id: number;
  stress_level: number;
  text_redacted: string;
  course_hash: string | null;
  dept_hash: string | null;
}

export interface AggregateItem {
  dept_hash: string | null;
  avg_stress: number | null;
  avg_valence: number | null;
  count: number;
}

export interface AggregateResponse {
  data: AggregateItem[];
}

export interface StatsResponse {
  total_checkins: number;
  avg_stress: number | null;
  avg_valence: number | null;
  high_stress_count: number;
  active_departments: number;
  distribution: Record<number, number>;
}

export interface TrendPoint {
  day: string;
  avg_stress: number;
  avg_valence: number | null;
  count: number;
}

export interface TrendResponse {
  data: TrendPoint[];
}

export interface PredictionsResponse {
  data: Record<string, number>;
  avg_confidence: Record<string, number | null>;
}

export interface MLHealthResponse {
  model_source: 'mlflow' | 'baseline';
  cache_age_seconds: number;
  is_production_model: boolean;
}

export interface InsightsTag {
  tag: string;
  count: number;
}

export interface InsightsResponse {
  top_tags: InsightsTag[];
  submission_trend: { last_24h: number; prev_24h: number };
  high_distress_signals: number;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json();
}

export function submitCheckin(data: CheckinPayload): Promise<CheckinResponse> {
  return apiFetch('/checkins/', { method: 'POST', body: JSON.stringify(data) });
}

export function getAINudge(
  stress_level: number,
  tags: string[],
  category: string
): Promise<{ nudge: string }> {
  return apiFetch('/checkins/nudge', {
    method: 'POST',
    body: JSON.stringify({ stress_level, tags, category }),
  });
}

export function getDashboardAggregate(): Promise<AggregateResponse> {
  return apiFetch('/dashboard/aggregate');
}

export function getDashboardStats(): Promise<StatsResponse> {
  return apiFetch('/dashboard/stats');
}

export function getDashboardTrend(days = 7): Promise<TrendResponse> {
  return apiFetch(`/dashboard/trend?days=${days}`);
}

export function getDashboardPredictions(): Promise<PredictionsResponse> {
  return apiFetch('/dashboard/predictions');
}

export function getMLHealth(): Promise<MLHealthResponse> {
  return apiFetch('/dashboard/ml-health');
}

export function getDashboardInsights(): Promise<InsightsResponse> {
  return apiFetch('/dashboard/insights');
}
