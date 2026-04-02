'use client'

import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

type DataPoint = {
  name: string
  value: number
  icon: string
  color: string
}

type Props = { data: DataPoint[] }

const COLORS = [
  '#4F8EF7', '#F7694F', '#9B59B6', '#E74C3C',
  '#F39C12', '#1ABC9C', '#3498DB', '#8E44AD',
  '#27AE60', '#95A5A6',
]

const formatINR = (v: number) =>
  `₹${Number(v).toLocaleString('en-IN')}`

export default function CategoryChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No category data yet.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [formatINR(value), name]}
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
        <Legend
          formatter={(value) => value}
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}