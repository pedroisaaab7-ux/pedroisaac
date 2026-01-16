import Link from "next/link";

import { getPrisma } from "@/lib/prisma";
import {
  buildPhaseCounts,
  buildStatusCounts,
  getCurrentPhaseName,
} from "@/lib/dashboard";
import { normalizeCpfDigits, processoStatusOptions } from "@/lib/processos";

const DEFAULT_STALLED_DAYS = 30;
const TOP_STALLED_LIMIT = 20;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    responsavel?: string;
    stalledDays?: string;
  }>;
};

type ProcessoDashboard = {
  id: string;
  numeroProcesso: string;
  status: string;
  updatedAt: Date;
  pessoa: { nome: string; cpfDigits: string };
  responsavelUsuario: { email: string } | null;
  fases: { status: string; faseTemplate: { nome: string; ordem: number } }[];
};

type UsuarioOption = {
  id: string;
  email: string;
};

export default async function HomePage({ searchParams }: DashboardPageProps) {
  const prisma = await getPrisma();
  const params = searchParams ? await searchParams : undefined;
  const stalledDays = Number(params?.stalledDays ?? DEFAULT_STALLED_DAYS);
  const stalledThreshold = Number.isNaN(stalledDays) ? DEFAULT_STALLED_DAYS : stalledDays;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - stalledThreshold);
  const nowTime = cutoffDate.getTime() + stalledThreshold * MS_PER_DAY;

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

  const [
    totalProcessos,
    statusCounts,
    fasesAtualizadasRaw,
    usuariosRaw,
    processosRaw,
  ] = await Promise.all([
    prisma.processo.count({ where: where as never }),
    prisma.processo.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: where as never,
    }),
    prisma.faseProcesso.groupBy({
      by: ["processoId"],
      _max: { updatedAt: true },
      where: {
        processo: where as never,
      },
    }),
    prisma.user.findMany({ select: { id: true, email: true }, orderBy: { email: "asc" } }),
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
    }),
  ]);

  const fasesAtualizadas = fasesAtualizadasRaw as Array<{
    processoId: string;
    _max: { updatedAt: Date | null };
  }>;
  const usuarios = usuariosRaw as UsuarioOption[];
  const processos = processosRaw as ProcessoDashboard[];

  const lastUpdateMap = new Map<string, Date>();
  fasesAtualizadas.forEach((item) => {
    if (item._max.updatedAt) {
      lastUpdateMap.set(item.processoId, item._max.updatedAt);
    }
  });

  const processosComFase = processos.map((processo) => {
    const currentPhase = getCurrentPhaseName(processo.fases);
    const lastUpdate = lastUpdateMap.get(processo.id) ?? processo.updatedAt;
    const daysWithoutUpdate = Math.floor(
      (nowTime - lastUpdate.getTime()) / MS_PER_DAY,
    );

    return {
      ...processo,
      currentPhase,
      lastUpdate,
      daysWithoutUpdate,
    };
  });

  const stalledProcessos = processosComFase
    .filter((processo) => processo.lastUpdate <= cutoffDate)
    .sort((a, b) => a.lastUpdate.getTime() - b.lastUpdate.getTime());

  const statusSummary = buildStatusCounts(statusCounts);
  const phaseCounts = buildPhaseCounts(processosComFase);

  const queryBase = new URLSearchParams();
  if (params?.q) queryBase.set("q", params.q);
  if (params?.status) queryBase.set("status", params.status);
  if (params?.responsavel) queryBase.set("responsavel", params.responsavel);
  if (params?.stalledDays) queryBase.set("stalledDays", params.stalledDays);

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-slate-600">
            Visão macro de processos, fases e backlog operacional.
          </p>
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
            Status macro
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
        <div className="md:col-span-2">
          <label className="text-sm font-medium" htmlFor="stalledDays">
            Parado há mais de (dias)
          </label>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            id="stalledDays"
            name="stalledDays"
            type="number"
            min={0}
            defaultValue={stalledThreshold}
          />
        </div>
        <div className="md:col-span-2 flex items-end gap-2">
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Aplicar filtros
          </button>
          <Link
            className="rounded-md border border-transparent px-3 py-2 text-sm text-slate-500 hover:underline"
            href="/"
          >
            Limpar
          </Link>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Total de processos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{totalProcessos}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Ativos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{statusSummary.ATIVO}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Suspensos</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{statusSummary.SUSPENSO}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Encerrados</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{statusSummary.ENCERRADO}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">
            Parados há {stalledThreshold} dias
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stalledProcessos.length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Funil por fase atual</h2>
          <p className="text-sm text-slate-600">
            Distribuição dos processos pela fase vigente.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {phaseCounts.length === 0 ? (
              <li className="text-slate-500">Nenhuma fase encontrada.</li>
            ) : (
              phaseCounts.map((item) => (
                <li key={item.phase} className="flex items-center justify-between">
                  <span>{item.phase}</span>
                  <span className="font-semibold text-slate-900">{item.count}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Parados há mais tempo</h2>
          <p className="text-sm text-slate-600">
            Top {TOP_STALLED_LIMIT} processos sem atualização de fase há mais tempo.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Número</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Fase atual</th>
                  <th className="px-3 py-2">Dias sem atualização</th>
                  <th className="px-3 py-2">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stalledProcessos.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-center text-slate-500" colSpan={5}>
                      Nenhum processo parado acima do critério.
                    </td>
                  </tr>
                ) : (
                  stalledProcessos.slice(0, TOP_STALLED_LIMIT).map((processo) => (
                    <tr key={processo.id}>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        <Link href={`/processos/${processo.id}`} className="hover:underline">
                          {processo.numeroProcesso}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{processo.pessoa.nome}</td>
                      <td className="px-3 py-2">{processo.currentPhase}</td>
                      <td className="px-3 py-2">{processo.daysWithoutUpdate} dias</td>
                      <td className="px-3 py-2">
                        {processo.responsavelUsuario?.email ?? "Sem responsável"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
