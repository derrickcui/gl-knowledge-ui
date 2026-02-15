export type RuntimeActiveItem = {
  id: number;
  name: string;
  datasetName: string;
  scopeLabel: string;
};

export async function fetchActiveRuntimes(): Promise<RuntimeActiveItem[]> {
  const res = await fetch("/api/runtime/active", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load runtimes");
  return res.json() as Promise<RuntimeActiveItem[]>;
}
