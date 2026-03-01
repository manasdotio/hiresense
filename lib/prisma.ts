import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString }); // Prisma adapter for PostgreSQL, using connection string from environment variableF
const prisma = new PrismaClient({ adapter });

export { prisma };