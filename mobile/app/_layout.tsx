import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "../context/AuthContext";
import { ScanHistoryProvider } from "../context/ScanHistoryContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <ScanHistoryProvider>
        <StatusBar style="dark" />

        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </ScanHistoryProvider>
    </AuthProvider>
  );
}
