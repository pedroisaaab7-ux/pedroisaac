import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

type FaseWorkflow = {
  id: string;
  status: string;
  notas: Array<{ id: string }>;
  faseTemplate: {
    id: string;
    nome: string;
    grupo: string;
    ordem: number;
  };
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const prisma = await getPrisma();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  const fases = (await prisma.faseProcesso.findMany({
    where: { processoId: id },
    include: {
      faseTemplate: true,
      notas: { select: { id: true } },
    },
    orderBy: { faseTemplate: { ordem: "asc" } },
  })) as FaseWorkflow[];

  return NextResponse.json({
    fases: fases.map((fase) => ({
      id: fase.id,
      status: fase.status,
      notasCount: fase.notas.length,
      faseTemplate: {
        id: fase.faseTemplate.id,
        nome: fase.faseTemplate.nome,
        grupo: fase.faseTemplate.grupo,
        ordem: fase.faseTemplate.ordem,
      },
    })),
  });
}
