import { NextRequest, NextResponse } from "next/server";
import { loadUpcomingBoard } from "../../../lib/server/match-board";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") || "10");

  try {
    const board = await loadUpcomingBoard(Number.isFinite(limit) ? limit : 10);
    return NextResponse.json(board);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
