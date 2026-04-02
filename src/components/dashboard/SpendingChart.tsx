'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

type DataPoint = {
  month: string
  total: number
  outOfPocket: number
  covered: number
}

type Props = { data: DataPoint[] }

const formatINR = (v: number) =>
  v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`

export default function SpendingChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No spending data yet. Add some expenses to see your chart.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barSize={14} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#888' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatINR}
          tick={{ fontSize: 11, fill: '#888' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `₹${Number(value).toLocaleString('en-IN')}`,
            name === 'outOfPocket' ? 'Out of Pocket' : name === 'covered' ? 'Covered' : 'Total',
          ]}
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
        <Legend
          formatter={(value) =>
            value === 'outOfPocket' ? 'Out of Pocket' : value === 'covered' ? 'Covered' : 'Total'
          }
          wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
        />
        <Bar dataKey="covered" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
        <Bar dataKey="outOfPocket" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}