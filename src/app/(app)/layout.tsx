import Link from "next/link";

import { getSessionUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold">
              Sistema PASEP
            </Link>
            <nav className="flex items-center gap-4 text-sm text-slate-600">
              <Link href="/">Dashboard</Link>
              <Link href="/processos">Processos</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>{user?.email ?? "Usuário"}</span>
            <form action="/api/auth/logout" method="post">
              <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
