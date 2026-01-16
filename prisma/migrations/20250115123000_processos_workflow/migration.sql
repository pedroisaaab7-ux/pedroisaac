-- CreateTable
CREATE TABLE "Pessoa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cpfDigits" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Processo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroProcesso" TEXT NOT NULL,
    "pessoaId" TEXT NOT NULL,
    "responsavelUsuarioId" TEXT,
    "estrategiaBaseTexto" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Processo_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Processo_responsavelUsuarioId_fkey" FOREIGN KEY ("responsavelUsuarioId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FaseTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowTemplateId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "grupo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FaseTemplate_workflowTemplateId_fkey" FOREIGN KEY ("workflowTemplateId") REFERENCES "WorkflowTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FaseProcesso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processoId" TEXT NOT NULL,
    "faseTemplateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NAO_INICIADA',
    "tesesSelecionadas" JSON,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FaseProcesso_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FaseProcesso_faseTemplateId_fkey" FOREIGN KEY ("faseTemplateId") REFERENCES "FaseTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotaFase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "faseProcessoId" TEXT NOT NULL,
    "autorUsuarioId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotaFase_faseProcessoId_fkey" FOREIGN KEY ("faseProcessoId") REFERENCES "FaseProcesso" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotaFase_autorUsuarioId_fkey" FOREIGN KEY ("autorUsuarioId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Pessoa_cpfDigits_key" ON "Pessoa"("cpfDigits");

-- CreateIndex
CREATE INDEX "Pessoa_nome_idx" ON "Pessoa"("nome");

-- CreateIndex
CREATE INDEX "Pessoa_cpfDigits_idx" ON "Pessoa"("cpfDigits");

-- CreateIndex
CREATE UNIQUE INDEX "Processo_numeroProcesso_key" ON "Processo"("numeroProcesso");

-- CreateIndex
CREATE INDEX "Processo_numeroProcesso_idx" ON "Processo"("numeroProcesso");

-- CreateIndex
CREATE INDEX "FaseTemplate_workflowTemplateId_ordem_idx" ON "FaseTemplate"("workflowTemplateId", "ordem");

-- CreateIndex
CREATE INDEX "FaseProcesso_processoId_idx" ON "FaseProcesso"("processoId");

-- CreateIndex
CREATE INDEX "FaseProcesso_faseTemplateId_idx" ON "FaseProcesso"("faseTemplateId");

-- CreateIndex
CREATE INDEX "NotaFase_faseProcessoId_idx" ON "NotaFase"("faseProcessoId");

-- CreateIndex
CREATE INDEX "NotaFase_autorUsuarioId_idx" ON "NotaFase"("autorUsuarioId");
