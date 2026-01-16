import { processoStatusOptions } from "@/lib/processos";

const DEFAULT_PHASE = "Sem fase";

type Fase = {
  status: string;
  faseTemplate: {
    nome: string;
    ordem: number;
  };
};

type Processo = {
  status: string;
  fases: Fase[];
  currentPhase?: string;
};

type StatusCountsInput = Array<{ status: string; _count: { _all: number } }>;

export function getCurrentPhaseName(fases: Fase[]) {
  if (!fases || fases.length === 0) return DEFAULT_PHASE;

  const ordered = [...fases].sort((a, b) => a.faseTemplate.ordem - b.faseTemplate.ordem);
  const current = ordered.find(
    (fase) => fase.status !== "CONCLUIDA" && fase.status !== "NAO_APLICAVEL",
  );

  return current?.faseTemplate.nome ?? ordered.at(-1)?.faseTemplate.nome ?? DEFAULT_PHASE;
}

export function buildPhaseCounts(processos: Processo[]) {
  const counts = new Map<string, number>();
  processos.forEach((processo) => {
    const phase = processo.currentPhase ?? getCurrentPhaseName(processo.fases);
    counts.set(phase, (counts.get(phase) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([phase, count]) => ({ phase, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildStatusCounts(input: StatusCountsInput) {
  const summary = processoStatusOptions.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<(typeof processoStatusOptions)[number], number>);

  input.forEach((item) => {
    if (item.status in summary) {
      summary[item.status as keyof typeof summary] = item._count._all;
    }
  });

  return summary;
}
