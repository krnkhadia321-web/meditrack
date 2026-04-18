import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { category, city, search } = await request.json()

    // Use the security-definer function for cross-user aggregation
    const { data: results, error } = await supabase.rpc('get_price_intelligence', {
      p_city: city || null,
      p_category: category || null,
      p_search: search || null,
    })

    if (error) {
      console.error('Price intelligence error:', error)
      return NextResponse.json({ error: 'Failed to fetch price data' }, { status: 500 })
    }

    // Get total data points for the footer stat
    const totalDataPoints = results?.reduce((s: number, r: any) => s + Number(r.sample_count), 0) ?? 0

    return NextResponse.json({
      city: city || 'All cities',
      results: results ?? [],
      totalDataPoints,
    })
  } catch (error) {
    console.error('Prices API error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
