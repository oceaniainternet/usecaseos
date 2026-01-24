import { db } from "./db";
import { users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedUser() {
  const email = "phillipb@oceaniainternet.com.au";
  const password = "123abcd";
  
  console.log("Checking for existing user...");
  
  const [existingUser] = await db.select().from(users).where(eq(users.email, email));
  
  if (existingUser) {
    console.log("User already exists, updating password...");
    const hashedPassword = await hashPassword(password);
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, email));
    console.log("Password updated!");
  } else {
    console.log("Creating new user...");
    const hashedPassword = await hashPassword(password);
    await db.insert(users).values({
      email,
      password: hashedPassword,
      firstName: "Phillip",
      lastName: "B",
    });
    console.log("User created!");
  }
  
  console.log(`User seeded: ${email}`);
}

seedUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
