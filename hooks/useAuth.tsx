import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  message: string | null;
  signIn: (provider: "google" | "apple") => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  clearMessage: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const clearMessage = useCallback(() => setMessage(null), []);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      await setSessionUser(data.session?.user ?? null);
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void setSessionUser(session?.user ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function setSessionUser(sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) {
    if (!sessionUser) {
      setUser(null);
      return;
    }

    const metadata = sessionUser.user_metadata ?? {};
    const nextUser: AuthUser = {
      id: sessionUser.id,
      email: sessionUser.email ?? "",
      name: typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : undefined,
      picture: typeof metadata.avatar_url === "string" ? metadata.avatar_url : typeof metadata.picture === "string" ? metadata.picture : undefined,
    };
    setUser(nextUser);
    await syncProfile(nextUser);
  }

  async function syncProfile(userData: AuthUser) {
    try {
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

  async function signIn(provider: "google" | "apple") {
    setIsSigningIn(true);
    setError(null);
    setMessage(null);
    try {
      const redirectTo = Linking.createURL("auth/callback");
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (oauthError) throw oauthError;
      if (!data.url) throw new Error("No sign-in URL was returned.");

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === "success") {
        const callbackUrl = new URL(result.url);
        const code = callbackUrl.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          return;
        }

        // Older/implicit Supabase callbacks return tokens in the URL fragment.
        const fragment = new URLSearchParams(callbackUrl.hash.replace(/^#/, ""));
        const callbackError = callbackUrl.searchParams.get("error_description")
          ?? fragment.get("error_description");
        if (callbackError) throw new Error(callbackError);

        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          return;
        }

        throw new Error("Google sign-in returned without a usable session. Please try again.");
      }
    } catch (err) {
      console.error("Sign in failed:", err);
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signInWithEmail(email: string, password: string) {
    setIsSigningIn(true);
    setError(null);
    setMessage(null);

    try {
      const cleanedEmail = email.trim();
      if (!cleanedEmail || !password) {
        throw new Error("Email and password are required.");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanedEmail,
        password,
      });

      if (signInError) throw signInError;
    } catch (err) {
      console.error("Email sign in failed:", err);
      setError(err instanceof Error ? err.message : "Email sign in failed");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signUpWithEmail(email: string, password: string) {
    setIsSigningIn(true);
    setError(null);
    setMessage(null);

    try {
      const cleanedEmail = email.trim();
      if (!cleanedEmail || !password) {
        throw new Error("Email and password are required.");
      }

      const redirectTo = Linking.createURL("auth/callback");
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanedEmail,
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) {
        throw new Error("Account could not be created.");
      }

      setMessage("Account created. Check your email for a verification link before signing in.");
    } catch (err) {
      console.error("Email sign up failed:", err);
      setError(err instanceof Error ? err.message : "Email sign up failed");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function resetPassword(email: string) {
    setIsSigningIn(true);
    setError(null);
    setMessage(null);

    try {
      const cleanedEmail = email.trim();
      if (!cleanedEmail) {
        throw new Error("Enter an email address to reset your password.");
      }

      const redirectTo = Linking.createURL("auth/callback");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanedEmail, {
        redirectTo,
      });

      if (resetError) throw resetError;
      setMessage("Password reset email sent. Check your inbox and follow the link to continue.");
    } catch (err) {
      console.error("Password reset failed:", err);
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isSigningIn,
      error,
      message,
      signIn,
      signInWithEmail,
      signUpWithEmail,
      resetPassword,
      signOut,
      clearError,
      clearMessage,
    }}>
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
