import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/**
 * Native-only gesture root wrapper.
 * On web, GestureRoot.web.tsx is used instead, which is a plain fragment.
 * This ensures react-native-gesture-handler is never loaded in the web bundle.
 */
export default function GestureRoot({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {children}
    </GestureHandlerRootView>
  );
}
