import { describe, expect, it } from "vitest";

import {
  buildFaseProcessoData,
  hasNotesIndicator,
  processoSchema,
} from "@/lib/processos";

describe("processos helpers", () => {
  it("validates cpf with 11 digits", () => {
    const result = processoSchema.safeParse({
      numeroProcesso: "123",
      nomePessoa: "Maria Silva",
      cpf: "123.456.789-01",
      responsavelUsuarioId: null,
      estrategiaBaseTexto: "Estratégia inicial",
      status: "ATIVO",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid cpf", () => {
    const result = processoSchema.safeParse({
      numeroProcesso: "123",
      nomePessoa: "Maria Silva",
      cpf: "123",
      responsavelUsuarioId: null,
      estrategiaBaseTexto: "Estratégia inicial",
      status: "ATIVO",
    });

    expect(result.success).toBe(false);
  });

  it("builds fase processo data", () => {
    const fases = buildFaseProcessoData([
      { id: "fase-1" },
      { id: "fase-2" },
    ], "processo-1");

    expect(fases).toHaveLength(2);
    expect(fases[0]).toEqual({ processoId: "processo-1", faseTemplateId: "fase-1" });
  });

  it("indicates notes presence", () => {
    expect(hasNotesIndicator(0)).toBe(false);
    expect(hasNotesIndicator(2)).toBe(true);
  });
});
