import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { notaSchema } from "@/lib/processos";
import { getSessionUser } from "@/lib/session";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; faseId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { id, faseId } = await context.params;
  const formData = await request.formData();
  const parsed = notaSchema.safeParse({
    texto: String(formData.get("texto") ?? "").trim(),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/processos/${id}?error=1`, request.url));
  }

  const fase = await prisma.faseProcesso.findUnique({ where: { id: faseId } });
  if (!fase || fase.processoId !== id) {
    return NextResponse.redirect(new URL(`/processos/${id}?error=1`, request.url));
  }

  await prisma.notaFase.create({
    data: {
      faseProcessoId: faseId,
      autorUsuarioId: user.id,
      texto: parsed.data.texto,
    },
  });

  return NextResponse.redirect(new URL(`/processos/${id}`, request.url));
}
