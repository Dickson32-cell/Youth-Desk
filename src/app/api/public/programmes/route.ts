import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PUBLIC: programmes open for registration (youth who cannot walk to the office).
// GET /api/public/programmes  -> [{id,title,description,category,deadline,venue,seats,registered}]
export async function GET() {
  const rows = await prisma.program.findMany({
    where: { status: "OPEN" },
    orderBy: { id: "desc" },
    take: 12,
    include: { _count: { select: { registrations: true } } },
  });
  return NextResponse.json({
    ok: true,
    rows: rows.map((r) => ({
      id: r.id, title: r.title, description: r.description, category: r.category,
      deadline: r.deadline, venue: r.venue, seats: r.seats,
      registered: r._count.registrations,
    })),
  });
}
