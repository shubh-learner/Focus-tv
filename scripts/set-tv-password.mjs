import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

// One-off: set the password for the single Focus account so it can sign in
// on the TV. Reads secrets from files; never prints the password.
const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => [
      line.slice(0, line.indexOf("=")).trim(),
      line.slice(line.indexOf("=") + 1).trim(),
    ])
);

const password = fs.readFileSync("/tmp/opencode/tv-password", "utf8").trim();
if (password.length < 8) throw new Error("Password must be at least 8 characters");

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const email = process.argv[2];
const { data, error } = await admin.auth.admin.listUsers();
if (error) throw error;

const users = email ? data.users.filter((user) => user.email === email) : data.users;
if (users.length !== 1) {
  throw new Error(`Expected 1 user, found ${users.length}; pass the email`);
}

await admin.auth.admin.updateUserById(users[0].id, { password });
fs.unlinkSync("/tmp/opencode/tv-password");
console.log(`Password updated for ${users[0].email}`);
