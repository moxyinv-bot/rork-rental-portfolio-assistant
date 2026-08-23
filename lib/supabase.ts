import { createClient } from "@supabase/supabase-js";

// Public Supabase client values are baked into the bundle so preview APKs do
// not depend on EAS environment variables.
const SUPABASE_URL = "https://rwjiuirzdkdphfsusuij.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3aml1aXJ6ZGtkcGhmc3VzdWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5OTk5NjUsImV4cCI6MjEwMTU3NTk2NX0.6SPk4wo09KoEGznjThMpi8hWT7iNwIKLwXzW6RxjWMQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: {},
  },
  auth: {
    persistSession: false,
  },
});
