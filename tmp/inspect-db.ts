import { SQL } from "bun";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL not set");
  process.exit(1);
}

const sql = new SQL(url);

const funcs = await sql`
  SELECT n.nspname, p.proname, p.prosecdef, pg_get_functiondef(p.oid) AS def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname IN ('user_id', 'is_household_member', 'is_household_owner', 'join_household_by_invite')
`;
console.log("=== FUNCTIONS ===");
for (const f of funcs) {
  console.log(`--- ${f.nspname}.${f.proname} (secdef=${f.prosecdef}) ---`);
  console.log(f.def);
}

const cons = await sql`
  SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE conrelid = 'public.household_members'::regclass
`;
console.log("=== CONSTRAINTS on household_members ===");
for (const c of cons) {
  console.log(`${c.conname}: ${c.def}`);
}

await sql.end();
