import Link from "next/link";

import { getPrisma } from "@/lib/prisma";
import {
  formatCpfMasked,
  normalizeCpfDigits,
  processoStatusOptions,
  summarizeStrategy,
} from "@/lib/processos";

const PAGE_SIZE = 10;

export const dynamic = "force-dynamic";

type ProcessosPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    responsavel?: string;
    page?: string;
  }>;
};

type ProcessoListItem = {
  id: string;
  numeroProcesso: string;
  status: string;
  estrategiaBaseTexto: string;
  updatedAt: Date;
  pessoa: { nome: string; cpfDigits: string };
  responsavelUsuario: { email: string } | null;
  fases: { status: string; faseTemplate: { nome: string; ordem: number } }[];
};

type UsuarioOption = {
  id: string;
  email: string;
};

function getCurrentPhaseName(
  fases: {
    status: string;
    faseTemplate: { nome: string; ordem: number };
  }[],
) {
  const ordered = [...fases].sort((a, b) => a.faseTemplate.ordem - b.faseTemplate.ordem);
  const current = ordered.find(
    (fase) => fase.status !== "CONCLUIDA" && fase.status !== "NAO_APLICAVEL",
  );
  return current?.faseTemplate.nome ?? ordered.at(-1)?.faseTemplate.nome ?? "-";
}

export default async function ProcessosPage({ searchParams }: ProcessosPageProps) {
  const prisma = await getPrisma();
  const params = searchParams ? await searchParams : undefined;
  const page = Math.max(Number(params?.page ?? "1"), 1);
  const offset = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {};

  if (params?.status && processoStatusOptions.includes(params.status as typeof processoStatusOptions[number])) {
    where.status = params.status as typeof processoStatusOptions[number];
  }

  if (params?.responsavel) {
    where.responsavelUsuarioId = params.responsavel;
  }

  if (params?.q) {
    const searchText = params.q.trim();
    const digits = normalizeCpfDigits(searchText);
    where.OR = [
      { numeroProcesso: { contains: searchText } },
      { pessoa: { nome: { contains: searchText, mode: "insensitive" } } },
      digits
        ? { pessoa: { cpfDigits: { contains: digits } } }
        : { pessoa: { cpfDigits: { equals: "__no_match__" } } },
    ];
  }

  const [total, processosRaw, usuariosRaw] = await Promise.all([
    prisma.processo.count({ where: where as never }),
    prisma.processo.findMany({
      where: where as never,
      include: {
        pessoa: true,
        responsavelUsuario: true,
        fases: {
          include: {
            faseTemplate: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: PAGE_SIZE,
      skip: offset,
    }),
    prisma.user.findMany({
      orderBy: { email: "asc" },
      select: { id: true, email: true },
    }),
  ]);

  const processos = processosRaw as ProcessoListItem[];
  const usuarios = usuariosRaw as UsuarioOption[];

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const queryBase = new URLSearchParams();
  if (params?.q) queryBase.set("q", params.q);
  if (params?.status) queryBase.set("status", params.status);
  if (params?.responsavel) queryBase.set("responsavel", params.responsavel);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Processos</h1>
          <p className="text-slate-600">Gerencie processos PASEP cadastrados.</p>
        </div>
        <Link
          href="/processos/novo"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Novo processo
        </Link>
      </header>

      <form className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="text-sm font-medium" htmlFor="q">
            Buscar por número, nome ou CPF
          </label>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            id="q"
            name="q"
            defaultValue={params?.q}
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="status">
            Status
          </label>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            id="status"
            name="status"
            defaultValue={params?.status ?? ""}
          >
            <option value="">Todos</option>
            {processoStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="responsavel">
            Responsável
          </label>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            id="responsavel"
            name="responsavel"
            defaultValue={params?.responsavel ?? ""}
          >
            <option value="">Todos</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.email}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-4">
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Aplicar filtros
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">CPF</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Fase atual</th>
              <th className="px-4 py-3">Estratégia</th>
              <th className="px-4 py-3">Atualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {processos.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-600" colSpan={7}>
                  Nenhum processo encontrado.
                </td>
              </tr>
            ) : (
              processos.map((processo) => (
                <tr key={processo.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/processos/${processo.id}`} className="hover:underline">
                      {processo.numeroProcesso}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{processo.pessoa.nome}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatCpfMasked(processo.pessoa.cpfDigits)}
                  </td>
                  <td className="px-4 py-3">{processo.status}</td>
                  <td className="px-4 py-3">{getCurrentPhaseName(processo.fases)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {summarizeStrategy(processo.estrategiaBaseTexto)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(processo.updatedAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Página {page} de {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Link
            className={`rounded-md border px-3 py-1.5 ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-100"}`}
            href={`/processos?${new URLSearchParams({
              ...Object.fromEntries(queryBase.entries()),
              page: String(Math.max(page - 1, 1)),
            }).toString()}`}
          >
            Anterior
          </Link>
          <Link
            className={`rounded-md border px-3 py-1.5 ${page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-slate-100"}`}
            href={`/processos?${new URLSearchParams({
              ...Object.fromEntries(queryBase.entries()),
              page: String(Math.min(page + 1, totalPages)),
            }).toString()}`}
          >
            Próxima
          </Link>
        </div>
      </div>
    </section>
  );
}
