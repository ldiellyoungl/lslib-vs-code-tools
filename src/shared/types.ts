export interface ValidationRules {
  valid: boolean;
  level: "valid" | "invalid" | "warning" | "none";
  reason: string;
}

export interface Version {
  major: number;
  minor: number;
  revision: number;
  build: number;
}
