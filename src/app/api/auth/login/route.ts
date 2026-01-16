import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const prisma = await getPrisma();
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.redirect(new URL("/login?error=1", request.url));
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=1", request.url));
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.redirect(new URL("/login?error=1", request.url));
  }

  await createSession(user.id);
  return NextResponse.redirect(new URL("/", request.url));
}
