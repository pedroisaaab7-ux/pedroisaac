import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaInstance = global.prisma ?? new PrismaClient();
export const prisma = prismaInstance as PrismaClient & Record<string, unknown>;

if (process.env.NODE_ENV !== "production") {
  global.prisma = prismaInstance;
}
