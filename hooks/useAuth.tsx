import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { supabase } from "@/lib/supabase";

// Public Rork client configuration is baked into the bundle so preview APKs
// do not depend on EAS environment variables.
const AUTH_URL = "https://api.rork.com";
const APP_KEY = "rpk_gms3l8hj9cag5cfau127pccgjtac3jne";
const PROJECT_ID = "7qnyyg8myr2908b1ajb2f";
const OAUTH_ACCESS_TOKEN_KEY = "rork_access_token";
const OAUTH_REFRESH_TOKEN_KEY = "rork_refresh_token";
const GUEST_MODE_KEY = "rork_guest_mode";

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  if (Platform.OS === "web" && typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    bytes.set(Crypto.getRandomBytes(32));
  }
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  if (Platform.OS === "web" && typeof globalThis.crypto?.subtle?.digest === "function") {
    const data = new TextEncoder().encode(verifier);
    const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  return digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

function parseTokenPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function userFromToken(token: string): AuthUser | null {
  try {
    const payload = parseTokenPayload(token);
    if (!payload) return null;

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email ?? "",
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  signIn: (provider: "google" | "apple") => Promise<void>;
  signInGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeVerifierRef = useRef<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", handleDeepLink);
    return () => subscription.remove();
  }, []);

  async function checkAuth() {
    try {
      const accessToken = Platform.OS === "web"
        ? localStorage.getItem(OAUTH_ACCESS_TOKEN_KEY)
        : await SecureStore.getItemAsync(OAUTH_ACCESS_TOKEN_KEY);

      if (!accessToken) {
        const refreshTokenStored = Platform.OS === "web"
          ? localStorage.getItem(OAUTH_REFRESH_TOKEN_KEY)
          : await SecureStore.getItemAsync(OAUTH_REFRESH_TOKEN_KEY);
        if (refreshTokenStored) {
          await refreshToken();
        }
        return;
      }

      const decoded = userFromToken(accessToken);
      if (decoded) {
        setUser(decoded);
        await syncProfile(decoded);
      } else {
        await refreshToken();
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function syncProfile(userData: AuthUser) {
    try {
      if (userData.id === "guest") {
        return;
      }
      await supabase.from("profiles").upsert({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        avatar_url: userData.picture,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    } catch (err) {
      console.error("Profile sync failed:", err);
    }
  }

  async function handleDeepLink(event: { url: string }) {
    try {
      const url = new URL(event.url);
      if (url.pathname === "/auth/callback") {
        const code = url.searchParams.get("code");
        if (code) {
          await exchangeCode(code);
        }
      }
    } catch (err) {
      console.error("Deep link handling failed:", err);
      setError(err instanceof Error ? err.message : "Sign in failed");
    }
  }

  async function signIn(provider: "google" | "apple") {
    setIsSigningIn(true);
    setError(null);
    try {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      codeVerifierRef.current = verifier;

      const isWeb = Platform.OS === "web";
      const target = "rn";
      const env = isWeb ? "preview" : "native";

      const response = await fetch(`${AUTH_URL}/oauth/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_key: APP_KEY, provider, code_challenge: challenge, target, env }),
      });

      if (!response.ok) {
        codeVerifierRef.current = null;
        const body = await response.json().catch(() => ({}));
        const message = body.error || `Sign in failed (${response.status})`;
        console.error(`Auth initiate failed (${response.status}):`, body);
        setError(message);
        return;
      }

      const { auth_url } = await response.json();

      if (isWeb) {
        const popup = window.open(auth_url, "_blank", "width=500,height=650");

        await new Promise<void>((resolve, reject) => {
          const onMessage = (event: MessageEvent) => {
            if (event.data?.type !== "rork_auth_callback") return;
            window.removeEventListener("message", onMessage);
            clearInterval(pollTimer);
            const code = event.data.code;
            if (code) {
              exchangeCode(code).then(resolve, reject);
            } else {
              reject(new Error("No code received"));
            }
          };
          window.addEventListener("message", onMessage);

          const pollTimer = setInterval(() => {
            if (popup?.closed) {
              clearInterval(pollTimer);
              window.removeEventListener("message", onMessage);
              codeVerifierRef.current = null;
              resolve();
            }
          }, 500);
        });
      } else {
        const result = await WebBrowser.openAuthSessionAsync(auth_url, `rork-${PROJECT_ID}://auth/callback`);

        if (result.type === "success") {
          const url = new URL(result.url);
          const code = url.searchParams.get("code");
          if (code) {
            await exchangeCode(code);
          }
        }
      }
    } catch (err) {
      console.error("Sign in failed:", err);
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function exchangeCode(code: string) {
    const verifier = codeVerifierRef.current;
    if (!verifier) return;
    codeVerifierRef.current = null;

    const response = await fetch(`${AUTH_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_key: APP_KEY, code, code_verifier: verifier }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = body.error || `Token exchange failed (${response.status})`;
      console.error(`Token exchange failed (${response.status}):`, body);
      setError(message);
      return;
    }

    const { access_token, refresh_token, user: userData } = await response.json();

    if (Platform.OS === "web") {
      localStorage.setItem(OAUTH_ACCESS_TOKEN_KEY, access_token);
      localStorage.setItem(OAUTH_REFRESH_TOKEN_KEY, refresh_token);
    } else {
      await SecureStore.setItemAsync(OAUTH_ACCESS_TOKEN_KEY, access_token);
      await SecureStore.setItemAsync(OAUTH_REFRESH_TOKEN_KEY, refresh_token);
    }

    const tokenUser = userFromToken(access_token);
    const normalizedUser: AuthUser = {
      id: tokenUser?.id || userData?.id,
      email: userData?.email || tokenUser?.email || "",
      name: userData?.name || tokenUser?.name,
      picture: userData?.picture || tokenUser?.picture,
    };

    if (!normalizedUser.id) {
      throw new Error("Sign in completed but no user id was found in token/response");
    }

    setUser(normalizedUser);
    await syncProfile(normalizedUser);
  }

  async function signInGuest() {
    setIsSigningIn(true);
    setError(null);
    try {
      const guestUser: AuthUser = {
        id: "guest",
        email: "guest@local",
        name: "Guest",
      };

      if (Platform.OS === "web") {
        localStorage.setItem(GUEST_MODE_KEY, "true");
        localStorage.removeItem(OAUTH_ACCESS_TOKEN_KEY);
        localStorage.removeItem(OAUTH_REFRESH_TOKEN_KEY);
      } else {
        await SecureStore.setItemAsync(GUEST_MODE_KEY, "true");
        await SecureStore.deleteItemAsync(OAUTH_ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(OAUTH_REFRESH_TOKEN_KEY);
      }

      setUser(guestUser);
    } catch (err) {
      console.error("Guest sign in failed:", err);
      setError(err instanceof Error ? err.message : "Guest sign in failed");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function refreshToken() {
    const storedRefreshToken = Platform.OS === "web"
      ? localStorage.getItem(OAUTH_REFRESH_TOKEN_KEY)
      : await SecureStore.getItemAsync(OAUTH_REFRESH_TOKEN_KEY);

    if (!storedRefreshToken) {
      setUser(null);
      return;
    }

    const response = await fetch(`${AUTH_URL}/oauth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_key: APP_KEY, refresh_token: storedRefreshToken }),
    });

    if (!response.ok) {
      await signOut();
      return;
    }

    const { access_token } = await response.json();

    if (Platform.OS === "web") {
      localStorage.setItem(OAUTH_ACCESS_TOKEN_KEY, access_token);
    } else {
      await SecureStore.setItemAsync(OAUTH_ACCESS_TOKEN_KEY, access_token);
    }

    const decoded = userFromToken(access_token);
    if (decoded) {
      setUser(decoded);
      await syncProfile(decoded);
    }
  }

  async function signOut() {
    if (Platform.OS === "web") {
      localStorage.removeItem(OAUTH_ACCESS_TOKEN_KEY);
      localStorage.removeItem(OAUTH_REFRESH_TOKEN_KEY);
      localStorage.removeItem(GUEST_MODE_KEY);
    } else {
      await SecureStore.deleteItemAsync(OAUTH_ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(OAUTH_REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(GUEST_MODE_KEY);
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isSigningIn, error, signIn, signInGuest, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
