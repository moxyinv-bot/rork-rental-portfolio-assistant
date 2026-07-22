import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { Building2 } from "lucide-react-native";

export default function LoginScreen() {
  const { isSigningIn, error, signIn, clearError } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        {/* Logo / Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoCircle}>
            <Building2 size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>Rental Portfolio</Text>
          <Text style={styles.tagline}>
            Manage your properties together — synced across all your devices
          </Text>
        </View>

        {/* Features */}
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

        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.errorDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sign in buttons */}
        <View style={styles.buttonContainer}>
          {isSigningIn && (
            <ActivityIndicator size="large" color="#3B82F6" style={{ marginBottom: 16 }} />
          )}

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
            style={[styles.appleButton, isSigningIn && styles.buttonDisabled]}
            onPress={() => signIn("apple")}
            disabled={isSigningIn}
            activeOpacity={0.8}
          >
            <AppleIcon />
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          By signing in, you agree to sync your rental portfolio data across your devices.
        </Text>
      </View>
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

function AppleIcon() {
  return (
    <View style={styles.appleIconWrapper}>
      <Text style={styles.appleIcon}></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 48,
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
