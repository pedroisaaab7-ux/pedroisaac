import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (email && password) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          isAdmin: true,
        },
      });
    }
  }

  const existingTemplate = await prisma.workflowTemplate.findFirst({
    where: { isDefault: true },
  });

  if (!existingTemplate) {
    const fases = [
      { grupo: "1º Grau", nome: "Protocolo" },
      { grupo: "1º Grau", nome: "Contestação" },
      { grupo: "1º Grau", nome: "Réplica" },
      { grupo: "1º Grau", nome: "Sentença" },
      { grupo: "1º Grau", nome: "Embargos (ED)" },
      { grupo: "2º Grau", nome: "Apelação/Contrarrazões" },
      { grupo: "2º Grau", nome: "Acórdão" },
      { grupo: "2º Grau", nome: "ED no 2º grau" },
      { grupo: "STJ", nome: "REsp" },
      { grupo: "STJ", nome: "Agravos correlatos" },
      { grupo: "STJ", nome: "Julgamento" },
      { grupo: "STF", nome: "RE" },
      { grupo: "STF", nome: "Agravos correlatos" },
      { grupo: "STF", nome: "Julgamento" },
    ];

    await prisma.workflowTemplate.create({
      data: {
        nome: "Workflow padrão PASEP",
        isDefault: true,
        fases: {
          create: fases.map((fase, index) => ({
            grupo: fase.grupo,
            nome: fase.nome,
            ordem: index + 1,
          })),
        },
      },
    });
  }
}

main()
  .catch((error) => {
    console.error("Seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
