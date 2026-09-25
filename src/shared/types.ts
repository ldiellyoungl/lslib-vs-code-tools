export interface ValidationRules {
  valid: boolean;
  level: "valid" | "invalid" | "warning" | "none";
  reason: string;
}
