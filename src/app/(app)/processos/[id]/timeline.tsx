"use client";

import { useMemo, useState } from "react";

import { faseStatusOptions, hasNotesIndicator } from "@/lib/processos";

type Nota = {
  id: string;
  texto: string;
  createdAt: string;
  autorEmail: string;
};

type Fase = {
  id: string;
  status: string;
  tesesSelecionadas: string[] | null;
  faseTemplate: {
    id: string;
    nome: string;
    grupo: string;
    ordem: number;
  };
  notas: Nota[];
};

type TimelineProps = {
  processoId: string;
  fases: Fase[];
};

const TESES_OPTIONS = [
  "Prescrição quinquenal",
  "Cálculo revisional",
  "Dano moral coletivo",
  "Complementação de saldo",
  "Negociação de acordo",
];

const STATUS_LABELS: Record<string, string> = {
  NAO_INICIADA: "Não iniciada",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  NAO_APLICAVEL: "Não aplicável",
};

function getCurrentIndex(fases: Fase[]) {
  const ordered = [...fases].sort((a, b) => a.faseTemplate.ordem - b.faseTemplate.ordem);
  const idx = ordered.findIndex(
    (fase) => fase.status !== "CONCLUIDA" && fase.status !== "NAO_APLICAVEL",
  );
  if (idx === -1) return ordered.length - 1;
  return idx;
}

export function Timeline({ processoId, fases }: TimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [searchNotes, setSearchNotes] = useState("");

  const groups = useMemo(() => {
    const grouped = fases.reduce<Record<string, Fase[]>>((acc, fase) => {
      const group = fase.faseTemplate.grupo;
      acc[group] = acc[group] ?? [];
      acc[group].push(fase);
      return acc;
    }, {});

    return Object.entries(grouped).map(([group, items]) => ({
      group,
      fases: items.sort((a, b) => a.faseTemplate.ordem - b.faseTemplate.ordem),
    }));
  }, [fases]);

  const selected = fases.find((fase) => fase.id === selectedId) ?? null;

  const allNotes = useMemo(() => {
    return fases.flatMap((fase) =>
      fase.notas.map((nota) => ({
        ...nota,
        faseNome: fase.faseTemplate.nome,
        faseGrupo: fase.faseTemplate.grupo,
      })),
    );
  }, [fases]);

  const filteredNotes = allNotes.filter((nota) => {
    if (!searchNotes.trim()) return true;
    const term = searchNotes.toLowerCase();
    return (
      nota.texto.toLowerCase().includes(term) ||
      nota.faseNome.toLowerCase().includes(term) ||
      nota.faseGrupo.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          onClick={() => setNotesPanelOpen(true)}
        >
          Ver todas as anotações
        </button>
      </div>

      <div className="space-y-8">
        {groups.map((group) => {
          const currentIndex = getCurrentIndex(group.fases);
          const totalSteps = group.fases.length;
          const progressPercent = totalSteps > 1 ? (currentIndex / (totalSteps - 1)) * 100 : 100;

          return (
            <div key={group.group} className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">{group.group}</h3>
              <div className="relative overflow-x-auto">
                <div className="relative flex min-w-max items-center gap-8 px-2 py-6">
                  <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
                  <div
                    className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-emerald-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                  {group.fases.map((fase, index) => {
                    const isCompleted = fase.status === "CONCLUIDA";
                    const isNotApplicable = fase.status === "NAO_APLICAVEL";
                    const isCurrent = index === currentIndex && !isCompleted && !isNotApplicable;

                    const circleClasses = isCompleted
                      ? "bg-emerald-500 border-emerald-500"
                      : isNotApplicable
                        ? "bg-slate-300 border-slate-400"
                        : isCurrent
                          ? "bg-white border-emerald-500"
                          : "bg-white border-slate-300";

                    return (
                      <button
                        type="button"
                        key={fase.id}
                        className="relative z-10 flex flex-col items-center gap-2 text-xs text-slate-600"
                        onClick={() => setSelectedId(fase.id)}
                      >
                        {hasNotesIndicator(fase.notas.length) ? (
                          <span className="absolute -top-1 h-2 w-2 rounded-full bg-sky-500" />
                        ) : null}
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${circleClasses}`}
                        />
                        <span className="w-24 text-center">{fase.faseTemplate.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40">
          <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selected.faseTemplate.nome}</h3>
                <p className="text-sm text-slate-600">{selected.faseTemplate.grupo}</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-600"
                onClick={() => setSelectedId(null)}
              >
                Fechar
              </button>
            </div>

            <form
              className="mt-6 space-y-4"
              action={`/api/processos/${processoId}/fases/${selected.id}`}
              method="post"
            >
              <div>
                <label className="text-sm font-medium" htmlFor="status">
                  Status da fase
                </label>
                <select
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  id="status"
                  name="status"
                  defaultValue={selected.status}
                >
                  {faseStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status] ?? status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-sm font-medium">Teses / estratégias</span>
                <div className="mt-2 space-y-2">
                  {TESES_OPTIONS.map((opcao) => (
                    <label key={opcao} className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        name="tesesSelecionadas"
                        value={opcao}
                        defaultChecked={selected.tesesSelecionadas?.includes(opcao)}
                      />
                      {opcao}
                    </label>
                  ))}
                </div>
              </div>
              <button className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Atualizar fase
              </button>
            </form>

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Anotações</h4>
                <span className="text-xs text-slate-500">{selected.notas.length}</span>
              </div>
              <form
                className="space-y-3"
                action={`/api/processos/${processoId}/fases/${selected.id}/notas`}
                method="post"
              >
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  name="texto"
                  required
                />
                <button className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  Adicionar anotação
                </button>
              </form>
              <div className="space-y-3">
                {selected.notas.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma anotação nesta fase.</p>
                ) : (
                  selected.notas.map((nota) => (
                    <div key={nota.id} className="rounded-md border border-slate-200 p-3 text-sm">
                      <p className="whitespace-pre-wrap text-slate-700">{nota.texto}</p>
                      <div className="mt-2 text-xs text-slate-500">
                        {nota.autorEmail} · {new Date(nota.createdAt).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {notesPanelOpen ? (
        <div className="fixed inset-0 z-30 flex justify-center bg-slate-900/40 p-6">
          <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">Todas as anotações</h3>
                <p className="text-sm text-slate-600">{allNotes.length} registros</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
                onClick={() => setNotesPanelOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="border-b border-slate-200 px-6 py-4">
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Buscar por fase ou conteúdo"
                value={searchNotes}
                onChange={(event) => setSearchNotes(event.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {filteredNotes.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma anotação encontrada.</p>
              ) : (
                <div className="space-y-4">
                  {filteredNotes.map((nota) => (
                    <div key={nota.id} className="rounded-md border border-slate-200 p-3 text-sm">
                      <div className="text-xs uppercase text-slate-500">
                        {nota.faseGrupo} · {nota.faseNome}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-slate-700">{nota.texto}</p>
                      <div className="mt-2 text-xs text-slate-500">
                        {nota.autorEmail} · {new Date(nota.createdAt).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
