import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Baked-in Rork platform configuration so standalone builds (EAS APKs) work
// without any environment variables. These are public client values — they
// ship inside every app bundle by design.
const SUPABASE_URL = "https://rssrexqqtpbtgofbhrzq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_WjBO_apqyc9SdpcM7viaaA_Fl8890Ll";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
  accessToken: async () => {
    if (Platform.OS === "web") {
      return localStorage.getItem("access_token") ?? null;
    }
    const token = await SecureStore.getItemAsync("access_token");
    return token ?? null;
  },
});
