import type { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export async function getPrisma(): Promise<PrismaClient> {
  if (!global.prisma) {
    const { PrismaClient } = await import("@prisma/client");
    global.prisma = new PrismaClient();
  }

  return global.prisma;
}
