import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import ExcelJS from "exceljs";

// Excel export of the whole walk-in youth register.
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const youth = await prisma.youth.findMany({
    orderBy: { serial: "asc" },
    select: {
      serial: true, name: true, phone: true, area: true, dateOfBirth: true,
      education: true, skills: true, ghanaCard: true, createdAt: true, source: true,
    },
  });

  const wb = new ExcelJS.Workbook();
  ws_setup(wb);
  const ws = wb.addWorksheet("Youth register");
  ws.columns = [
    { header: "Serial", key: "serial", width: 12 },
    { header: "Full name", key: "name", width: 26 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Area / community", key: "area", width: 20 },
    { header: "Date of birth", key: "dateOfBirth", width: 14 },
    { header: "Education", key: "education", width: 20 },
    { header: "Skills", key: "skills", width: 28 },
    { header: "Ghana Card", key: "ghanaCard", width: 20 },
    { header: "Registered", key: "createdAt", width: 18 },
    { header: "Source", key: "source", width: 12 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: "FF122447" } };
  ws.addRow({}).values = [];
  // rows come newest-last here (serial asc) - register order
  for (const y of youth) {
    ws.addRow({
      serial: y.serial,
      name: y.name,
      phone: y.phone || "",
      area: y.area || "",
      dateOfBirth: y.dateOfBirth || "",
      education: y.education || "",
      skills: y.skills || "",
      ghanaCard: y.ghanaCard || "",
      createdAt: new Date(y.createdAt).toLocaleString("en-GB"),
      source: y.source === "ONLINE" ? "Online" : "Walk-in",
    });
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 10 } };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="NJSMA-Youth-Register-${stamp}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function ws_setup(_wb: unknown) {
  void _wb; // placeholder for future sheet styling helpers
}
