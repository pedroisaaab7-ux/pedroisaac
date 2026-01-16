import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { formatCpfMasked, processoStatusOptions } from "@/lib/processos";

import { Timeline } from "./timeline";

type ProcessoPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function ProcessoPage({ params, searchParams }: ProcessoPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;

  const processo = await prisma.processo.findUnique({
    where: { id },
    include: {
      pessoa: true,
      responsavelUsuario: true,
      fases: {
        include: {
          faseTemplate: true,
          notas: {
            include: {
              autorUsuario: { select: { email: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { faseTemplate: { ordem: "asc" } },
      },
    },
  });

  if (!processo) {
    notFound();
  }

  const usuarios = await prisma.user.findMany({
    orderBy: { email: "asc" },
    select: { id: true, email: true },
  });

  const fasesData = processo.fases.map((fase) => ({
    id: fase.id,
    status: fase.status,
    tesesSelecionadas: fase.tesesSelecionadas as string[] | null,
    faseTemplate: {
      id: fase.faseTemplate.id,
      nome: fase.faseTemplate.nome,
      grupo: fase.faseTemplate.grupo,
      ordem: fase.faseTemplate.ordem,
    },
    notas: fase.notas.map((nota) => ({
      id: nota.id,
      texto: nota.texto,
      createdAt: nota.createdAt.toISOString(),
      autorEmail: nota.autorUsuario.email,
    })),
  }));

  return (
    <section className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Processo {processo.numeroProcesso}</h1>
          <p className="text-slate-600">Ficha completa do processo PASEP.</p>
        </div>
        <Link href="/processos" className="text-sm text-slate-600 hover:underline">
          Voltar para lista
        </Link>
      </div>

      {query?.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Não foi possível salvar as alterações. Revise os campos.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Dados principais</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <span className="text-xs uppercase text-slate-500">Nome</span>
              <p className="text-sm font-medium text-slate-900">{processo.pessoa.nome}</p>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500">CPF</span>
              <p className="text-sm font-mono text-slate-900">
                {formatCpfMasked(processo.pessoa.cpfDigits)}
              </p>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500">Status macro</span>
              <p className="text-sm font-medium text-slate-900">{processo.status}</p>
            </div>
            <div>
              <span className="text-xs uppercase text-slate-500">Responsável</span>
              <p className="text-sm font-medium text-slate-900">
                {processo.responsavelUsuario?.email ?? "Sem responsável"}
              </p>
            </div>
          </div>
          <div>
            <span className="text-xs uppercase text-slate-500">Estratégia base</span>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
              {processo.estrategiaBaseTexto}
            </p>
          </div>
        </div>

        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Editar processo</h2>
          <form className="space-y-4" action={`/api/processos/${processo.id}`} method="post">
            <div>
              <label className="text-sm font-medium" htmlFor="numeroProcesso">
                Número do processo
              </label>
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                id="numeroProcesso"
                name="numeroProcesso"
                defaultValue={processo.numeroProcesso}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="nomePessoa">
                Nome da pessoa
              </label>
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                id="nomePessoa"
                name="nomePessoa"
                defaultValue={processo.pessoa.nome}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="cpf">
                CPF (11 dígitos)
              </label>
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                id="cpf"
                name="cpf"
                placeholder={formatCpfMasked(processo.pessoa.cpfDigits)}
                inputMode="numeric"
              />
              <p className="mt-1 text-xs text-slate-500">Deixe em branco para manter o CPF atual.</p>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="responsavelUsuarioId">
                Responsável interno
              </label>
              <select
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                id="responsavelUsuarioId"
                name="responsavelUsuarioId"
                defaultValue={processo.responsavelUsuarioId ?? ""}
              >
                <option value="">Sem responsável</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="status">
                Status macro
              </label>
              <select
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                id="status"
                name="status"
                defaultValue={processo.status}
              >
                {processoStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="estrategiaBaseTexto">
                Estratégia base
              </label>
              <textarea
                className="mt-2 min-h-[100px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                id="estrategiaBaseTexto"
                name="estrategiaBaseTexto"
                defaultValue={processo.estrategiaBaseTexto}
                required
              />
            </div>
            <button className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Salvar alterações
            </button>
          </form>
          <form
            className="pt-2"
            action={`/api/processos/${processo.id}/delete`}
            method="post"
          >
            <button className="w-full rounded-md border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
              Excluir processo
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Workflow e timeline</h2>
          <p className="text-sm text-slate-600">
            Clique em uma fase para atualizar o status, selecionar teses e registrar anotações.
          </p>
        </div>
        <Timeline processoId={processo.id} fases={fasesData} />
      </div>
    </section>
  );
}
