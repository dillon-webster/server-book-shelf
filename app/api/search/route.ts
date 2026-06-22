import { NextResponse } from "next/server";
import { searchOpenLibrary } from "@/lib/open-library";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchOpenLibrary(query);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Book search is unavailable right now.", results: [] },
      { status: 502 },
    );
  }
}
