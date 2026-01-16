import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  await prisma.processo.delete({ where: { id } });

  return NextResponse.redirect(new URL("/processos", request.url));
}
