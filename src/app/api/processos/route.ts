import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  buildFaseProcessoData,
  normalizeCpfDigits,
  processoSchema,
  processoStatusOptions,
} from "@/lib/processos";
import { getSessionUser } from "@/lib/session";

const PAGE_SIZE = 10;

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const responsavel = url.searchParams.get("responsavel") ?? "";
  const page = Math.max(Number(url.searchParams.get("page") ?? "1"), 1);
  const offset = (page - 1) * PAGE_SIZE;

  const where: Parameters<typeof prisma.processo.findMany>[0]["where"] = {};

  if (status && processoStatusOptions.includes(status as typeof processoStatusOptions[number])) {
    where.status = status as typeof processoStatusOptions[number];
  }

  if (responsavel) {
    where.responsavelUsuarioId = responsavel;
  }

  if (q) {
    const digits = normalizeCpfDigits(q);
    where.OR = [
      { numeroProcesso: { contains: q } },
      { pessoa: { nome: { contains: q, mode: "insensitive" } } },
      digits
        ? { pessoa: { cpfDigits: { contains: digits } } }
        : { pessoa: { cpfDigits: { equals: "__no_match__" } } },
    ];
  }

  const processos = await prisma.processo.findMany({
    where,
    include: { pessoa: true, responsavelUsuario: true },
    orderBy: { updatedAt: "desc" },
    take: PAGE_SIZE,
    skip: offset,
  });

  return NextResponse.json({ processos });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const parsed = processoSchema.safeParse({
    numeroProcesso: String(formData.get("numeroProcesso") ?? "").trim(),
    nomePessoa: String(formData.get("nomePessoa") ?? "").trim(),
    cpf: String(formData.get("cpf") ?? ""),
    responsavelUsuarioId: String(formData.get("responsavelUsuarioId") ?? "") || null,
    estrategiaBaseTexto: String(formData.get("estrategiaBaseTexto") ?? "").trim(),
    status: String(formData.get("status") ?? "ATIVO"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/processos/novo?error=1", request.url));
  }

  const template = await prisma.workflowTemplate.findFirst({
    where: { isDefault: true },
    include: { fases: { orderBy: { ordem: "asc" } } },
  });

  if (!template) {
    return NextResponse.redirect(new URL("/processos/novo?error=1", request.url));
  }

  try {
    const pessoa = await prisma.pessoa.upsert({
      where: { cpfDigits: parsed.data.cpf },
      update: { nome: parsed.data.nomePessoa },
      create: { nome: parsed.data.nomePessoa, cpfDigits: parsed.data.cpf },
    });

    const processo = await prisma.processo.create({
      data: {
        numeroProcesso: parsed.data.numeroProcesso,
        pessoaId: pessoa.id,
        responsavelUsuarioId: parsed.data.responsavelUsuarioId,
        estrategiaBaseTexto: parsed.data.estrategiaBaseTexto,
        status: parsed.data.status,
      },
    });

    const fasesData = buildFaseProcessoData(template.fases, processo.id);
    await prisma.faseProcesso.createMany({ data: fasesData });

    return NextResponse.redirect(new URL(`/processos/${processo.id}`, request.url));
  } catch {
    return NextResponse.redirect(new URL("/processos/novo?error=1", request.url));
  }
}
