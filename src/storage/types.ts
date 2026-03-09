export interface SerializedProject {
  id: string;
  name: string;
  version: number;
  bodies: SerializedBody[];
  sketches: SerializedSketch[];
  createdAt: number;
  updatedAt: number;
}

export interface SerializedBody {
  id: string;
  name: string;
  geometryData: string; // base64 encoded geometry
  operations: SerializedOperation[];
  visible: boolean;
}

export interface SerializedOperation {
  id: string;
  type: string;
  label: string;
  icon: string;
  params: Record<string, unknown>;
  timestamp: number;
}

export interface SerializedSketch {
  id: string;
  plane: string;
  planeOffset: number;
  primitives: unknown[];
  profiles: unknown[];
}
