import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MediTrack — Healthcare Cost Tracker',
  description: 'Track, optimize, and reduce your family\'s healthcare spending in India.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}