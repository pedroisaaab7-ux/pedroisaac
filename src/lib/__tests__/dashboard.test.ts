import { describe, expect, it } from "vitest";

import { buildPhaseCounts, getCurrentPhaseName } from "@/lib/dashboard";

describe("dashboard helpers", () => {
  it("derives current phase correctly", () => {
    const current = getCurrentPhaseName([
      { status: "CONCLUIDA", faseTemplate: { nome: "Protocolo", ordem: 1 } },
      { status: "EM_ANDAMENTO", faseTemplate: { nome: "Contestação", ordem: 2 } },
    ]);

    expect(current).toBe("Contestação");
  });

  it("builds phase counts for pipeline", () => {
    const counts = buildPhaseCounts([
      {
        status: "ATIVO",
        fases: [
          { status: "CONCLUIDA", faseTemplate: { nome: "Protocolo", ordem: 1 } },
          { status: "EM_ANDAMENTO", faseTemplate: { nome: "Contestação", ordem: 2 } },
        ],
      },
      {
        status: "ATIVO",
        fases: [
          { status: "CONCLUIDA", faseTemplate: { nome: "Protocolo", ordem: 1 } },
          { status: "CONCLUIDA", faseTemplate: { nome: "Contestação", ordem: 2 } },
          { status: "NAO_INICIADA", faseTemplate: { nome: "Réplica", ordem: 3 } },
        ],
      },
    ]);

    expect(counts).toEqual([
      { phase: "Contestação", count: 1 },
      { phase: "Réplica", count: 1 },
    ]);
  });
});
