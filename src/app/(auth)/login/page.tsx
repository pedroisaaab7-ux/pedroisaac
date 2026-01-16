type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const hasError = resolvedParams?.error === "1";

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold">Acessar o sistema</h1>
        <p className="text-sm text-slate-600">
          Use seu e-mail e senha para entrar.
        </p>
      </div>
      {hasError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Credenciais inválidas. Verifique e tente novamente.
        </div>
      ) : null}
      <form className="space-y-4" action="/api/auth/login" method="post">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            E-mail
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            id="email"
            name="email"
            type="email"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Senha
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            id="password"
            name="password"
            type="password"
            required
          />
        </div>
        <button className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          Entrar
        </button>
      </form>
    </div>
  );
}
