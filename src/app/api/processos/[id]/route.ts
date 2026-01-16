import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { processoUpdateSchema } from "@/lib/processos";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const formData = await request.formData();
  const parsed = processoUpdateSchema.safeParse({
    numeroProcesso: String(formData.get("numeroProcesso") ?? "").trim(),
    nomePessoa: String(formData.get("nomePessoa") ?? "").trim(),
    cpf: String(formData.get("cpf") ?? "").trim() || undefined,
    responsavelUsuarioId: String(formData.get("responsavelUsuarioId") ?? "") || null,
    estrategiaBaseTexto: String(formData.get("estrategiaBaseTexto") ?? "").trim(),
    status: String(formData.get("status") ?? ""),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/processos/${id}?error=1`, request.url));
  }

  const processo = await prisma.processo.findUnique({
    where: { id },
    include: { pessoa: true },
  });

  if (!processo) {
    return NextResponse.redirect(new URL("/processos", request.url));
  }

  const data = parsed.data;

  try {
    if (data.cpf && data.cpf !== processo.pessoa.cpfDigits) {
      await prisma.pessoa.update({
        where: { id: processo.pessoaId },
        data: {
          cpfDigits: data.cpf,
          nome: data.nomePessoa ?? processo.pessoa.nome,
        },
      });
    } else {
      await prisma.pessoa.update({
        where: { id: processo.pessoaId },
        data: {
          nome: data.nomePessoa ?? processo.pessoa.nome,
        },
      });
    }

    await prisma.processo.update({
      where: { id },
      data: {
        numeroProcesso: data.numeroProcesso ?? processo.numeroProcesso,
        responsavelUsuarioId: data.responsavelUsuarioId,
        estrategiaBaseTexto: data.estrategiaBaseTexto ?? processo.estrategiaBaseTexto,
        status: data.status ?? processo.status,
      },
    });

    return NextResponse.redirect(new URL(`/processos/${id}`, request.url));
  } catch {
    return NextResponse.redirect(new URL(`/processos/${id}?error=1`, request.url));
  }
}
