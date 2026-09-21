/* ------------------------------------------------------------------
   Reusable, theme-aware chart components built on Recharts. Every chart
   reads its colours from the centralised tone tokens.
------------------------------------------------------------------ */
import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '../../lib/utils'
import { useIsDark } from '../../hooks/useIsDark'
import { TONES, type Tone } from '../ui/tokens'
import { Card, SectionHeader } from '../ui/Card'

function useAxisTheme() {
  const dark = useIsDark()
  return {
    dark,
    axis: dark ? '#8b9ba6' : '#64777f',
    grid: dark ? 'rgba(255,255,255,0.07)' : 'rgba(10,20,27,0.07)',
    cursor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(10,20,27,0.05)',
  }
}

interface TooltipEntry {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

function ChartTooltip({
  active,
  payload,
  label,
  unit = '',
  formatter,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  unit?: string
  formatter?: (value: number, name: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="card min-w-33 p-3 text-xs shadow-pop">
      {label !== undefined ? <p className="mb-1.5 font-bold text-ink">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const name = String(entry.name ?? entry.dataKey ?? '')
          const value = Number(entry.value ?? 0)
          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="size-2 rounded-full" style={{ background: entry.color ?? TONES.brand.hex }} />
                {name}
              </span>
              <span className="font-bold text-ink tabular-nums">
                {formatter ? formatter(value, name) : `${value.toLocaleString('en-US')}${unit}`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
  icon,
  height = 240,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  icon?: ReactNode
  height?: number
}) {
  return (
    <Card className={cn('p-4 sm:p-5', className)}>
      <SectionHeader title={title} subtitle={subtitle} action={action} icon={icon} />
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </Card>
  )
}

export interface SeriesPoint {
  label: string
  [key: string]: string | number
}

export function TrendArea({
  data,
  dataKey,
  tone = 'brand',
  unit = '',
  name,
  referenceValue,
  referenceLabel,
  yDomain,
}: {
  data: SeriesPoint[]
  dataKey: string
  tone?: Tone
  unit?: string
  name?: string
  referenceValue?: number
  referenceLabel?: string
  yDomain?: [number | 'auto', number | 'auto']
}) {
  const { axis, grid } = useAxisTheme()
  const color = TONES[tone].hex
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={`area-${dataKey}-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 6" stroke={grid} vertical={false} />
        <XAxis dataKey="label" stroke={axis} fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
        <YAxis stroke={axis} fontSize={11} tickLine={false} axisLine={false} domain={yDomain} width={52} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: grid, strokeWidth: 1 }} />
        {referenceValue !== undefined ? (
          <ReferenceLine y={referenceValue} stroke={axis} strokeDasharray="4 4" label={{ value: referenceLabel, position: 'insideTopRight', fill: axis, fontSize: 10 }} />
        ) : null}
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name ?? dataKey}
          stroke={color}
          strokeWidth={2.4}
          fill={`url(#area-${dataKey}-${tone})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: color, fill: '#fff' }}
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function SeriesBars({
  data,
  dataKey,
  tone = 'calorie',
  unit = '',
  name,
  targetValue,
  rounded = 8,
  secondaryKey,
  secondaryTone = 'water',
  secondaryName,
  xInterval,
}: {
  data: SeriesPoint[]
  dataKey: string
  tone?: Tone
  unit?: string
  name?: string
  targetValue?: number
  rounded?: number
  secondaryKey?: string
  secondaryTone?: Tone
  secondaryName?: string
  xInterval?: number
}) {
  const { axis, grid, cursor } = useAxisTheme()
  const color = TONES[tone].hex
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="4 6" stroke={grid} vertical={false} />
        <XAxis dataKey="label" stroke={axis} fontSize={11} tickLine={false} axisLine={false} interval={xInterval} />
        <YAxis stroke={axis} fontSize={11} tickLine={false} axisLine={false} width={52} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: cursor }} />
        {secondaryKey ? <Legend wrapperStyle={{ fontSize: 11, color: axis }} iconType="circle" /> : null}
        <Bar dataKey={dataKey} name={name ?? dataKey} fill={color} radius={[rounded, rounded, 0, 0]} maxBarSize={38} animationDuration={900}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={targetValue !== undefined && Number(entry[dataKey]) >= targetValue ? TONES.brand.hex : color}
            />
          ))}
        </Bar>
        {secondaryKey ? (
          <Bar
            dataKey={secondaryKey}
            name={secondaryName ?? secondaryKey}
            fill={TONES[secondaryTone].hex}
            radius={[rounded, rounded, 0, 0]}
            maxBarSize={38}
            animationDuration={900}
          />
        ) : null}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TrendLine({
  data,
  dataKey,
  tone = 'violet',
  unit = '',
  name,
  yDomain,
}: {
  data: SeriesPoint[]
  dataKey: string
  tone?: Tone
  unit?: string
  name?: string
  yDomain?: [number | 'auto', number | 'auto']
}) {
  const { axis, grid } = useAxisTheme()
  const color = TONES[tone].hex
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 6" stroke={grid} vertical={false} />
        <XAxis dataKey="label" stroke={axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={20} />
        <YAxis stroke={axis} fontSize={11} tickLine={false} axisLine={false} width={52} domain={yDomain} />
        <Tooltip content={<ChartTooltip unit={unit} />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={name ?? dataKey}
          stroke={color}
          strokeWidth={2.4}
          dot={{ r: 2.5, strokeWidth: 0, fill: color }}
          activeDot={{ r: 5 }}
          animationDuration={900}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function MacroDonut({
  data,
  size = 200,
}: {
  data: { name: string; value: number; tone: Tone }[]
  size?: number
}) {
  const total = data.reduce((acc, item) => acc + item.value, 0)
  const { axis } = useAxisTheme()
  if (total <= 0) {
    return (
      <div className="grid h-full place-items-center text-sm text-muted" style={{ height: size }}>
        No macros logged today
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="62%"
          outerRadius="92%"
          paddingAngle={3}
          strokeWidth={0}
          animationDuration={800}
        >
          {data.map((item) => (
            <Cell key={item.name} fill={TONES[item.tone].hex} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip unit="g" />} />
        <Legend wrapperStyle={{ fontSize: 11, color: axis }} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  )
}
