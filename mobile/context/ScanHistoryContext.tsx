import { createContext, useContext, useState, type ReactNode } from "react";

import type { ScanHistoryItem } from "../types/history";
import type { ScanResult } from "../types/scan";
import { useAuth } from "./AuthContext";

interface ScanHistoryContextValue {
  items: ScanHistoryItem[];
  addScan: (url: string, result: ScanResult) => void;
  clearHistory: () => void;
}

interface ScanHistoryProviderProps {
  children: ReactNode;
}

type HistoryByUser = Record<string, ScanHistoryItem[]>;

const ScanHistoryContext = createContext<ScanHistoryContextValue | undefined>(
  undefined,
);

export function ScanHistoryProvider({ children }: ScanHistoryProviderProps) {
  const { user } = useAuth();

  const [historyByUser, setHistoryByUser] = useState<HistoryByUser>({});

  const normalizedEmail = user?.email.trim().toLowerCase() ?? "";

  const items = normalizedEmail ? (historyByUser[normalizedEmail] ?? []) : [];

  const addScan = (url: string, result: ScanResult) => {
    if (!normalizedEmail) {
      return;
    }

    const historyItem: ScanHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      url,
      verdict: result.verdict,
      riskScore: result.riskScore,
      title: result.title,
      message: result.message,
      scannedAt: new Date().toISOString(),
    };

    setHistoryByUser((currentHistory) => {
      const currentUserHistory = currentHistory[normalizedEmail] ?? [];

      return {
        ...currentHistory,
        [normalizedEmail]: [historyItem, ...currentUserHistory].slice(0, 50),
      };
    });
  };

  const clearHistory = () => {
    if (!normalizedEmail) {
      return;
    }

    setHistoryByUser((currentHistory) => ({
      ...currentHistory,
      [normalizedEmail]: [],
    }));
  };

  return (
    <ScanHistoryContext.Provider
      value={{
        items,
        addScan,
        clearHistory,
      }}
    >
      {children}
    </ScanHistoryContext.Provider>
  );
}

export function useScanHistory() {
  const context = useContext(ScanHistoryContext);

  if (context === undefined) {
    throw new Error(
      "useScanHistory, ScanHistoryProvider içerisinde kullanılmalıdır.",
    );
  }

  return context;
}
