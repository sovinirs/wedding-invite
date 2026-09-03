/* Creates a demo account and a published invitation so you can see the whole
   flow immediately. Safe to re-run: it upserts. */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as _scrypt } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (p: string, s: string, l: number) => Promise<Buffer>;
const db = new PrismaClient();

async function hash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await scrypt(password, salt, 64)).toString("hex")}`;
}

async function main() {
  const email = "demo@example.com";
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Demo", passwordHash: await hash("demo12345") },
  });

  await db.invite.upsert({
    where: { slug: "demo-wedding" },
    update: {},
    create: {
      slug: "demo-wedding",
      userId: user.id,
      templateId: "temple",
      partnerOne: "Arjun",
      partnerTwo: "Meera",
      eventDate: "November 14, 2026",
      eventTime: "Reception: 6:30 PM\nMarriage: 9:00 AM - 10:00 AM",
      venueName: "SP Grand Palace",
      mapsUrl: "https://maps.google.com",
      published: true,
    },
  });

  console.log("Seeded. Sign in with demo@example.com / demo12345");
  console.log("Demo invitation: /i/demo-wedding");
}

main().finally(() => db.$disconnect());
