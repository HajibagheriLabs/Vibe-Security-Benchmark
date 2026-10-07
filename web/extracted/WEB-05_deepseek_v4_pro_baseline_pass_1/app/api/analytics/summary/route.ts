import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsSummary } from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    const startDate = startParam ? new Date(startParam) : undefined;
    const endDate = endParam ? new Date(endParam) : undefined;

    if (startParam && isNaN(startDate!.getTime())) {
      return NextResponse.json(
        { error: "Invalid start date parameter" },
        { status: 400 }
      );
    }
    if (endParam && isNaN(endDate!.getTime())) {
      return NextResponse.json(
        { error: "Invalid end date parameter" },
        { status: 400 }
      );
    }

    const summary = await getAnalyticsSummary(startDate, endDate);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Analytics summary API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics summary" },
      { status: 500 }
    );
  }
}