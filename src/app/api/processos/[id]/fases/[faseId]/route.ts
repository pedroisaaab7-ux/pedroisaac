import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/prisma";
import { faseUpdateSchema } from "@/lib/processos";
import { getSessionUser } from "@/lib/session";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; faseId: string }> },
) {
  const prisma = await getPrisma();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { id, faseId } = await context.params;
  const formData = await request.formData();
  const status = String(formData.get("status") ?? "");
  const tesesSelecionadas = formData.getAll("tesesSelecionadas").map(String);

  const parsed = faseUpdateSchema.safeParse({
    status,
    tesesSelecionadas,
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/processos/${id}?error=1`, request.url));
  }

  const fase = await prisma.faseProcesso.findUnique({
    where: { id: faseId },
  });

  if (!fase || fase.processoId !== id) {
    return NextResponse.redirect(new URL(`/processos/${id}?error=1`, request.url));
  }

  const now = new Date();
  const nextStatus = parsed.data.status;

  const shouldStart = nextStatus === "EM_ANDAMENTO" || nextStatus === "CONCLUIDA";

  await prisma.faseProcesso.update({
    where: { id: faseId },
    data: {
      status: nextStatus,
      tesesSelecionadas: parsed.data.tesesSelecionadas ?? [],
      startedAt: fase.startedAt ?? (shouldStart ? now : null),
      completedAt: nextStatus === "CONCLUIDA" ? now : null,
    },
  });

  return NextResponse.redirect(new URL(`/processos/${id}`, request.url));
}
