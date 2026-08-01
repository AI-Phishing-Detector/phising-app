export type ScanVerdict = "safe" | "dangerous";

export type ScanResult = {
  verdict: ScanVerdict;
  riskScore: number;
  title: string;
  message: string;
};
