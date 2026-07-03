import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { PortfolioProvider } from "@/hooks/portfolio-store";
import ErrorBoundary from "@/components/ErrorBoundary";

try {
  SplashScreen.preventAutoHideAsync();
} catch (e) {
  console.warn('SplashScreen.preventAutoHideAsync failed:', e);
}

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="property/[id]" options={{ title: "Property Details" }} />
      <Stack.Screen name="add-property" options={{ title: "Add Property", presentation: "modal" }} />
      <Stack.Screen name="add-transaction" options={{ title: "Add Transaction", presentation: "modal" }} />
      <Stack.Screen name="add-receipt" options={{ title: "Add Receipt", presentation: "modal" }} />
      <Stack.Screen name="add-reminder" options={{ title: "Add Reminder", presentation: "modal" }} />
      <Stack.Screen name="edit-property/[id]" options={{ title: "Edit Property", presentation: "modal" }} />
      <Stack.Screen name="edit-transaction/[id]" options={{ title: "Edit Transaction", presentation: "modal" }} />
      <Stack.Screen name="edit-receipt/[id]" options={{ title: "Edit Receipt", presentation: "modal" }} />
      <Stack.Screen name="scan-lease-document" options={{ title: "Scan Document", presentation: "modal" }} />
      <Stack.Screen name="create-lease-document" options={{ title: "Create Document", presentation: "modal" }} />
      <Stack.Screen name="lease-folder/[id]" options={{ title: "Lease Folder" }} />
      <Stack.Screen name="lease-document/[id]" options={{ title: "Lease Document" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    try {
      SplashScreen.hideAsync();
    } catch (e) {
      console.warn('SplashScreen.hideAsync failed:', e);
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PortfolioProvider>
          <RootLayoutNav />
        </PortfolioProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}