import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const ExpoGoSecureStore = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  deleteItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {},
  },
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

void ExpoGoSecureStore;
