import { z } from "zod";

export const processoStatusOptions = ["ATIVO", "SUSPENSO", "ENCERRADO"] as const;

export const faseStatusOptions = [
  "NAO_INICIADA",
  "EM_ANDAMENTO",
  "CONCLUIDA",
  "NAO_APLICAVEL",
] as const;

const cpfSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value.length === 11, "CPF deve ter 11 dígitos.");

const cpfOptionalSchema = z
  .string()
  .optional()
  .transform((value) => (value ? value.replace(/\D/g, "") : value))
  .refine((value) => value === undefined || value.length === 11, "CPF deve ter 11 dígitos.");

export const processoSchema = z.object({
  numeroProcesso: z.string().min(1, "Número do processo é obrigatório."),
  nomePessoa: z.string().min(2, "Nome é obrigatório."),
  cpf: cpfSchema,
  responsavelUsuarioId: z.string().optional().nullable(),
  estrategiaBaseTexto: z.string().min(1, "Estratégia é obrigatória."),
  status: z.enum(processoStatusOptions).default("ATIVO"),
});

export const processoUpdateSchema = z.object({
  numeroProcesso: z.string().min(1, "Número do processo é obrigatório.").optional(),
  nomePessoa: z.string().min(2, "Nome é obrigatório.").optional(),
  cpf: cpfOptionalSchema,
  responsavelUsuarioId: z.string().optional().nullable(),
  estrategiaBaseTexto: z.string().min(1, "Estratégia é obrigatória.").optional(),
  status: z.enum(processoStatusOptions).optional(),
});

export const faseUpdateSchema = z.object({
  status: z.enum(faseStatusOptions),
  tesesSelecionadas: z.array(z.string()).optional(),
});

export const notaSchema = z.object({
  texto: z.string().min(1, "Anotação não pode ser vazia."),
});

export function normalizeCpfDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCpfMasked(digits: string) {
  const sanitized = normalizeCpfDigits(digits);
  if (sanitized.length !== 11) {
    return "***.***.***-**";
  }
  return `${sanitized.slice(0, 3)}.***.***-${sanitized.slice(9, 11)}`;
}

export function summarizeStrategy(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 60) return trimmed;
  return `${trimmed.slice(0, 57)}...`;
}

export function hasNotesIndicator(count: number) {
  return count > 0;
}

export function buildFaseProcessoData(
  faseTemplates: { id: string }[],
  processoId: string,
) {
  return faseTemplates.map((fase) => ({
    processoId,
    faseTemplateId: fase.id,
  }));
}
