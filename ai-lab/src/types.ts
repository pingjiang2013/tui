export interface Settings {
  query: number;
  weight: number;
  bias: number;
  rate: number;
  input: number;
  sample: number;
  text: string;
  temperature: number;
  causal: boolean;
  heads: number;
  head: number;
  position: boolean;
}
export interface TraceStep {
  label: string;
  expression: string;
  value: number | string | number[] | number[][];
}
export interface Snapshot {
  query_input?: number;
  query_prediction?: number;
  details?: AttentionDetails;
  kind: string;
  output: number | string | number[];
  loss?: number;
  gradient?: number[];
  next?: number[];
  points?: { x: number; target: number; pred: number }[];
  curve?: { x: number; y: number }[];
  nodes?: number[];
  tokens?: { label: string; id: number }[];
  matrix?: number[][];
  labels?: string[];
  embeddings?: number[][];
  q?: number[][];
  k?: number[][];
  v?: number[][];
  scores?: number[][];
  mixed?: number[][];
  probabilities?: { label: string; value: number; logit: number }[];
  trace: TraceStep[];
  text?: string;
  step?: number;
  source?: string;
}
export interface Progress {
  version: 1;
  current?: string;
  stages: Record<string, number>;
  tasks: Record<string, boolean>;
  passed: Record<string, boolean>;
  visited: Record<string, boolean>;
}
export interface AttentionDetails {
  products: number[][][];
  dots: number[][];
  scale: number;
  exponentials: number[][];
  denominators: number[];
  contributions: number[][][];
}
export const defaultSettings: Settings = {
  query: 6,
  weight: 1.2,
  bias: 0.5,
  rate: 0.03,
  input: 0.8,
  sample: 2,
  text: "小猫",
  temperature: 1,
  causal: false,
  heads: 1,
  head: 0,
  position: false,
};
