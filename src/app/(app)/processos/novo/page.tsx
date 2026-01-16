import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { processoStatusOptions } from "@/lib/processos";

type NovoProcessoPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function NovoProcessoPage({ searchParams }: NovoProcessoPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const usuarios = await prisma.user.findMany({
    orderBy: { email: "asc" },
    select: { id: true, email: true },
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Novo processo</h1>
          <p className="text-slate-600">Cadastre um novo processo PASEP.</p>
        </div>
        <Link href="/processos" className="text-sm text-slate-600 hover:underline">
          Voltar para lista
        </Link>
      </div>

      {params?.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Não foi possível cadastrar. Verifique os campos obrigatórios.
        </div>
      ) : null}

      <form
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-2"
        action="/api/processos"
        method="post"
      >
        <div className="md:col-span-2">
          <label className="text-sm font-medium" htmlFor="numeroProcesso">
            Número do processo (CNJ)
          </label>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            id="numeroProcesso"
            name="numeroProcesso"
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
            inputMode="numeric"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="responsavelUsuarioId">
            Responsável interno
          </label>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            id="responsavelUsuarioId"
            name="responsavelUsuarioId"
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
            defaultValue="ATIVO"
          >
            {processoStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium" htmlFor="estrategiaBaseTexto">
            Estratégia base
          </label>
          <textarea
            className="mt-2 min-h-[120px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            id="estrategiaBaseTexto"
            name="estrategiaBaseTexto"
            required
          />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Salvar processo
          </button>
        </div>
      </form>
    </section>
  );
}
