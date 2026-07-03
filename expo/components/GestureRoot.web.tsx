import React from 'react';

/**
 * Web fallback — no gesture handler.
 * react-native-gesture-handler is NOT imported here, so it never
 * enters the web bundle and cannot register touch handlers that
 * cause "Cannot find single active touch" crashes.
 */
export default function GestureRoot({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
