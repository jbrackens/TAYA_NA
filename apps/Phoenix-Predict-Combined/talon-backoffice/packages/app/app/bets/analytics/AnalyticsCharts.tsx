'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { BetAnalyticsPeriod, StakeBucket } from '../../lib/api/betting-client';

interface ChartTooltipPayloadEntry {
  color?: string;
  name?: string;
  value?: number | string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadEntry[];
  label?: string | number;
  format?: (v: number) => string;
}

/* Custom tooltip to avoid recharts v3 strict formatter typing */
function ChartTooltip({ active, payload, label, format }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...TOOLTIP_STYLE, padding: '8px 12px' }}>
      <div style={{ marginBottom: 4, color: '#94a3b8', fontSize: 11 }}>{typeof label === 'string' ? formatDay(label) : String(label ?? '')}</div>
      {payload.map((entry: ChartTooltipPayloadEntry, i: number) => (
        <div key={i} style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <span style={{ color: entry.color }}>{entry.name}</span>
          <strong>{format ? format(Number(entry.value)) : String(entry.value)}</strong>
        </div>
      ))}
    </div>
  );
}

interface AnalyticsChartsProps {
  cumulativeDailyROI: Array<{ period: string; roi: number }>;
  monthly: BetAnalyticsPeriod[];
  cumulativePL: Array<{ period: string; pl: number }>;
  stakeBuckets: StakeBucket[];
}

const TOOLTIP_STYLE = {
  backgroundColor: '#0f1225',
  border: '1px solid #1a1f3a',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '12px',
};

const AXIS_TICK = { fill: '#94a3b8', fontSize: 11 };

function formatMonth(period: string): string {
  if (!period) return '';
  const parts = period.split('-');
  if (parts.length >= 2) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(parts[1], 10) - 1;
    return monthNames[monthIndex] ?? period;
  }
  return period;
}

function formatDay(period: string): string {
  if (!period) return '';
  const parts = period.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}`;
  }
  return period;
}

export default function AnalyticsCharts({
  cumulativeDailyROI,
  monthly,
  cumulativePL,
  stakeBuckets,
}: AnalyticsChartsProps) {
  return (
    <div className="analytics-chart-grid">
      {/* ROI Over Time */}
      <div className="analytics-chart-card">
        <div className="analytics-chart-title">ROI Over Time</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={cumulativeDailyROI}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={AXIS_TICK} tickFormatter={formatDay} />
            <YAxis tick={AXIS_TICK} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip content={(props: Record<string, unknown>) => <ChartTooltip {...props as ChartTooltipProps} format={(v) => `${v.toFixed(1)}%`} />} />
            <Line
              type="monotone"
              dataKey="roi"
              stroke="#39ff14"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#39ff14' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Win Rate by Month */}
      <div className="analytics-chart-card">
        <div className="analytics-chart-title">Win Rate by Month</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthly}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={AXIS_TICK} tickFormatter={formatMonth} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip content={(props: Record<string, unknown>) => <ChartTooltip {...props as ChartTooltipProps} />} />
            <Bar dataKey="wonCount" stackId="a" fill="#22c55e" name="Won" radius={[0, 0, 0, 0]} />
            <Bar dataKey="lostCount" stackId="a" fill="#ef4444" name="Lost" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative P&L */}
      <div className="analytics-chart-card">
        <div className="analytics-chart-title">Cumulative P&amp;L</div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={cumulativePL}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={AXIS_TICK} tickFormatter={formatDay} />
            <YAxis tick={AXIS_TICK} tickFormatter={(v: number) => `$${v}`} />
            <Tooltip content={<ChartTooltip format={(v) => `$${v.toFixed(2)}`} />} />
            <defs>
              <linearGradient id="plGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#39ff14" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#39ff14" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="pl"
              stroke="#39ff14"
              strokeWidth={2}
              fill="url(#plGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stake Distribution */}
      <div className="analytics-chart-card">
        <div className="analytics-chart-title">Stake Distribution</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={stakeBuckets}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip content={(props: Record<string, unknown>) => <ChartTooltip {...props as ChartTooltipProps} />} />
            <Bar dataKey="count" fill="#39ff14" radius={[4, 4, 0, 0]} name="Bets" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
