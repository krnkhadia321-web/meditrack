import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { city } = await request.json();
    if (!city)
      return NextResponse.json({ error: "City is required" }, { status: 400 });

    // Search for Jan Aushadhi stores via Tavily
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `Pradhan Mantri Jan Aushadhi Kendra store address ${city} India location`,
        search_depth: "basic",
        max_results: 8,
        include_answer: true,
      }),
    });

    const data = await res.json();

    // Also search for PMJAK app store locator
    const res2 = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `Jan Aushadhi store near ${city} phone number address generic medicines`,
        search_depth: "basic",
        max_results: 5,
        include_answer: true,
      }),
    });

    const data2 = await res2.json();

    // Parse results into structured store list
    const stores: any[] = [];
    const allResults = [...(data.results ?? []), ...(data2.results ?? [])];

    allResults.forEach((r: any, i: number) => {
      const content = r.content ?? "";
      const title = r.title ?? "";

      // Only include results that look like actual store listings
      if (
        content.toLowerCase().includes("jan aushadhi") ||
        title.toLowerCase().includes("jan aushadhi") ||
        content.toLowerCase().includes("aushadhi kendra")
      ) {
        stores.push({
          id: i,
          name: extractStoreName(title, content, i),
          address: extractAddress(content, city),
          area: extractArea(content, city),
          phone: extractPhone(content),
          url: r.url,
          snippet: content.slice(0, 200),
        });
      }
    });

    // Remove duplicates by name
    const unique = stores
      .filter((s, i, arr) => arr.findIndex((t) => t.name === s.name) === i)
      .slice(0, 6);

    return NextResponse.json({
      city,
      stores: unique,
      summary: data.answer ?? `Jan Aushadhi stores found in ${city}`,
      totalFound: unique.length,
    });
  } catch (error) {
    console.error("Jan Aushadhi search error:", error);
    return NextResponse.json(
      { error: "Failed to search stores" },
      { status: 500 },
    );
  }
}

function extractStoreName(
  title: string,
  content: string,
  index: number,
): string {
  // Try to extract a meaningful store name
  if (title.toLowerCase().includes("jan aushadhi")) {
    const cleaned = title.replace(/[-|].*$/, "").trim();
    if (cleaned.length < 60) return cleaned;
  }
  return `Jan Aushadhi Kendra #${index + 1}`;
}

function extractAddress(content: string, city: string): string {
  // Look for address patterns
  const addressPatterns = [
    /(?:address|located at|shop no)[:\s]+([^.]+)/i,
    /(\d+[,\s]+[A-Za-z\s]+(?:road|street|nagar|colony|sector|block|phase)[^.]+)/i,
  ];
  for (const pattern of addressPatterns) {
    const match = content.match(pattern);
    if (match) return match[1].trim().slice(0, 100);
  }
  return `${city}, India`;
}

function extractArea(content: string, city: string): string {
  const areaPatterns = [
    /(?:sector|nagar|colony|block|phase|area)\s+[\w\s-]+/i,
    new RegExp(`${city}[,\\s]+([\\w\\s]+)`, "i"),
  ];
  for (const pattern of areaPatterns) {
    const match = content.match(pattern);
    if (match) return match[0].trim().slice(0, 50);
  }
  return city;
}

function extractPhone(content: string): string | null {
  const phoneMatch = content.match(/(?:\+91[\s-]?)?[6-9]\d{9}/);
  return phoneMatch ? phoneMatch[0] : null;
}
