import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main() {
  const email = readArg("--email");
  const password = readArg("--password");

  if (!email || !password) {
    console.error("Uso: npm run create-admin -- --email email@exemplo.com --password senha");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error("Usuário já existe.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      isAdmin: true,
    },
  });

  console.log("Usuário admin criado.");
}

main()
  .catch((error) => {
    console.error("Falha ao criar usuário admin.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
