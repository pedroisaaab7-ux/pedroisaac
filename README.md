# Sistema de Gestão PASEP (MVP)

MVP do Sistema de Gestão PASEP com Next.js (App Router), TailwindCSS, Prisma e SQLite para desenvolvimento local.

Para usar Postgres no futuro, basta trocar o `DATABASE_URL` no `.env` para a conexão desejada.

## Como rodar local

1. Instale dependências:

```bash
npm install
```

2. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

3. Rode as migrações e gere o Prisma Client:

```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma migrate dev
```

4. Inicie o servidor:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

## Como rodar migrações e seed

- Rodar migrações:

```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma migrate dev
```

- Rodar seed (exige variáveis para o admin):

```bash
SEED_ADMIN_EMAIL="admin@exemplo.com" SEED_ADMIN_PASSWORD="sua-senha" npm run prisma:seed
```

## Como criar o 1º usuário admin

Após configurar o banco, execute:

```bash
npm run create-admin -- --email admin@exemplo.com --password sua-senha
```

## Como cadastrar um processo

1. Faça login no sistema.
2. Acesse **Processos** no menu superior.
3. Clique em **Novo processo**.
4. Preencha os campos obrigatórios (número do processo, nome, CPF e estratégia).
5. Salve para abrir a ficha e acompanhar o workflow.

## Como usar o dashboard

1. Faça login e acesse a Home.
2. Use os filtros globais para status, responsável, texto e dias parado.
3. Consulte os KPIs e o funil por fase atual.
4. Verifique a lista de processos parados há mais tempo e clique para abrir a ficha.

## Scripts úteis

- `npm run dev` – servidor local.
- `npm run lint` – lint.
- `npm run build` – build de produção.
- `npm run test` – testes unitários (Vitest).
