import type { ScanVerdict } from "./scan";

export interface ScanHistoryItem {
  id: string;
  url: string;
  verdict: ScanVerdict;
  riskScore: number;
  title: string;
  message: string;
  scannedAt: string;
}
