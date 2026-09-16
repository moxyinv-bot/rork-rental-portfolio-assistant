import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { Building2 } from "lucide-react-native";

export default function LoginScreen() {
  const {
    isSigningIn,
    error,
    message,
    signIn,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    clearError,
    clearMessage,
  } = useAuth();

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const submitLabel = useMemo(
    () => (mode === "signIn" ? "Sign in with email" : "Create account"),
    [mode]
  );

  const handleEmailSubmit = async () => {
    if (mode === "signUp") {
      if (!email.trim() || !password) {
        return;
      }

      if (password !== confirmPassword) {
        return;
      }

      await signUpWithEmail(email, password);
      return;
    }

    await signInWithEmail(email, password);
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      return;
    }

    await resetPassword(email);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.brandSection}>
            <View style={styles.logoCircle}>
              <Building2 size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>PadCommand</Text>
            <Text style={styles.tagline}>
              Meet PadCommand - your command center for managing everything you own.
            </Text>
          </View>

          <View style={styles.featuresSection}>
            <View style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Track income & expenses</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Share with family members</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Real-time cloud sync</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Lease & document management</Text>
            </View>
          </View>

          <View style={styles.buttonStack}>
            <TouchableOpacity
              style={[styles.googleButton, isSigningIn && styles.buttonDisabled]}
              onPress={() => signIn("google")}
              disabled={isSigningIn}
              activeOpacity={0.8}
            >
              <GoogleIcon />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, isSigningIn && styles.buttonDisabled]}
              onPress={() => setShowEmailForm((value) => !value)}
              disabled={isSigningIn}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Log in with another email</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={clearError}>
                <Text style={styles.errorDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {message && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{message}</Text>
              <TouchableOpacity onPress={clearMessage}>
                <Text style={styles.successDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {showEmailForm && (
            <View style={styles.authCard}>
              <View style={styles.modeToggleRow}>
                <TouchableOpacity
                  style={[styles.modeToggle, mode === "signIn" && styles.modeToggleActive]}
                  onPress={() => setMode("signIn")}
                >
                  <Text style={[styles.modeToggleText, mode === "signIn" && styles.modeToggleTextActive]}>
                    Sign in
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeToggle, mode === "signUp" && styles.modeToggleActive]}
                  onPress={() => setMode("signUp")}
                >
                  <Text style={[styles.modeToggleText, mode === "signUp" && styles.modeToggleTextActive]}>
                    Create account
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#64748B"
                secureTextEntry
              />

              {mode === "signUp" && (
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                />
              )}

              {mode === "signIn" && (
                <TouchableOpacity onPress={handleResetPassword} disabled={isSigningIn}>
                  <Text style={styles.linkText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, isSigningIn && styles.buttonDisabled]}
                onPress={handleEmailSubmit}
                disabled={isSigningIn}
                activeOpacity={0.8}
              >
                {isSigningIn ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>{submitLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.footerText}>
            By signing in, you agree to sync your PadCommand data across your devices.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIconWrapper}>
      <Text style={styles.googleIconG}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  content: {
    flexGrow: 1,
  },
  brandSection: {
    alignItems: "center",
    paddingTop: 32,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  featuresSection: {
    paddingVertical: 24,
    gap: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
  },
  featureText: {
    fontSize: 16,
    color: "#CBD5E1",
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 14,
    flex: 1,
  },
  errorDismiss: {
    color: "#FCA5A5",
    fontWeight: "600" as const,
    marginLeft: 8,
  },
  successContainer: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  successText: {
    color: "#BBF7D0",
    fontSize: 14,
    flex: 1,
  },
  successDismiss: {
    color: "#BBF7D0",
    fontWeight: "600" as const,
    marginLeft: 8,
  },
  authCard: {
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  modeToggleRow: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeToggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modeToggleActive: {
    backgroundColor: "#3B82F6",
  },
  modeToggleText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  modeToggleTextActive: {
    color: "#FFFFFF",
  },
  input: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#F8FAFC",
    fontSize: 16,
    marginBottom: 12,
  },
  linkText: {
    color: "#7DD3FC",
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: 12,
    alignSelf: "flex-end",
  },
  secondaryButton: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.45)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  secondaryButtonText: {
    color: "#BFDBFE",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  primaryButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  buttonStack: {
    gap: 12,
    marginBottom: 16,
    width: "100%",
  },
  buttonContainer: {
    gap: 12,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    width: "100%",
  },
  googleButtonText: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
  },
  appleButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  guestButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.35)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
  },
  guestButtonText: {
    color: "#BFDBFE",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  googleIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
  },
  googleIconG: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  appleIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  appleIcon: {
    color: "#FFFFFF",
    fontSize: 22,
  },
  footerText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
});
