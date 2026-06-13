import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type UserFile = {
  users: StoredUser[];
};

const DATA_DIR = path.join(process.cwd(), ".local-data");
const USERS_PATH = path.join(DATA_DIR, "users.json");

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function ensureStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_PATH);
  } catch {
    const initial: UserFile = { users: [] };
    await fs.writeFile(USERS_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readStore(): Promise<UserFile> {
  await ensureStore();
  const raw = await fs.readFile(USERS_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<UserFile>;
  return { users: Array.isArray(parsed.users) ? parsed.users : [] };
}

async function writeStore(data: UserFile): Promise<void> {
  await ensureStore();
  await fs.writeFile(USERS_PATH, JSON.stringify(data, null, 2), "utf8");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, saved] = passwordHash.split(":");
  if (!salt || !saved) return false;

  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(saved, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const store = await readStore();
  const normalized = normalizeEmail(email);
  return store.users.find((user) => user.email === normalized) ?? null;
}

export async function createUser(email: string, password: string): Promise<{ id: string; email: string }> {
  const normalized = normalizeEmail(email);
  const store = await readStore();

  if (store.users.some((user) => user.email === normalized)) {
    throw new Error("An account with that email already exists.");
  }

  const user: StoredUser = {
    id: `user_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    email: normalized,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  store.users.push(user);
  await writeStore(store);

  return { id: user.id, email: user.email };
}

export async function verifyUser(email: string, password: string): Promise<{ id: string; email: string } | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return { id: user.id, email: user.email };
}

