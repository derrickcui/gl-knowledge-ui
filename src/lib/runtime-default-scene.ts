export type DefaultRuntimeSceneSelection = {
  id: number;
  name?: string;
  datasetName?: string;
  updatedAt: string;
};

export const RUNTIME_DEFAULT_SCENE_STORAGE_KEY = "runtime.defaultSceneSelection";

export function readDefaultRuntimeSceneSelection(): DefaultRuntimeSceneSelection | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(RUNTIME_DEFAULT_SCENE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DefaultRuntimeSceneSelection> | null;
    if (!parsed || typeof parsed.id !== "number" || !Number.isFinite(parsed.id)) return null;
    return {
      id: parsed.id,
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      datasetName: typeof parsed.datasetName === "string" ? parsed.datasetName : undefined,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeDefaultRuntimeSceneSelection(selection: {
  id: number;
  name?: string;
  datasetName?: string;
}) {
  if (typeof window === "undefined") return;
  const payload: DefaultRuntimeSceneSelection = {
    id: selection.id,
    name: selection.name,
    datasetName: selection.datasetName,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(RUNTIME_DEFAULT_SCENE_STORAGE_KEY, JSON.stringify(payload));
}

