import type { ComponentType } from "react";
import type * as THREE from "three";
import type { CanvasAPI } from "./CanvasAPI";
import type { EventBus } from "./EventBus";

// ── Plugin System ──

export interface Plugin {
  id: string;
  name: string;
  icon: ComponentType;
  category: "sketch" | "create" | "modify" | "io";
  activate(api: CanvasAPI, bus: EventBus): void;
  deactivate(): void;
  toolbar?: ComponentType;
  panel?: ComponentType;
  skillId: string;
  aiTools?: Record<string, (params: Record<string, unknown>) => Promise<unknown>>;
}

// ── Geometry / Scene ──

export interface Body {
  id: string;
  name: string;
  mesh: THREE.Mesh;
  operations: Operation[];
  visible: boolean;
}

export interface Operation {
  id: string;
  type: "sketch" | "extrude" | "hole" | "import";
  label: string;
  icon: string;
  params: Record<string, unknown>;
  timestamp: number;
}

// ── Sketch ──

export type SketchPrimitive =
  | SketchLine
  | SketchCircle
  | SketchRectangle
  | SketchArc
  | SketchEllipse
  | SketchPolyline;

export interface SketchLine {
  type: "line";
  start: [number, number];
  end: [number, number];
}

export interface SketchCircle {
  type: "circle";
  center: [number, number];
  radius: number;
}

export interface SketchRectangle {
  type: "rectangle";
  origin: [number, number];
  width: number;
  height: number;
}

export interface SketchArc {
  type: "arc";
  center: [number, number];
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface SketchEllipse {
  type: "ellipse";
  center: [number, number];
  radiusX: number;
  radiusY: number;
}

export interface SketchPolyline {
  type: "polyline";
  points: [number, number][];
  closed: boolean;
}

export interface Sketch {
  id: string;
  plane: "XY" | "XZ" | "YZ";
  planeOffset: number;
  primitives: SketchPrimitive[];
  profiles: SketchProfile[];
}

export interface SketchProfile {
  id: string;
  edges: number[]; // indices into primitives
  closed: boolean;
}

// ── Constraints ──

export type Constraint =
  | { type: "horizontal"; primitiveIndex: number }
  | { type: "vertical"; primitiveIndex: number }
  | { type: "coincident"; point1: [number, number]; point2: [number, number] }
  | { type: "equal"; indices: [number, number] };

// ── Events ──

export interface EditorEvents {
  "sketch:start": { plane: "XY" | "XZ" | "YZ" };
  "sketch:complete": { sketchId: string };
  "sketch:cancel": void;
  "extrude:request": { sketchId: string; profileId: string };
  "extrude:complete": { bodyId: string };
  "hole:request": { bodyId: string; position: [number, number, number]; radius: number; depth: number };
  "hole:complete": { bodyId: string };
  "body:select": { bodyId: string | null };
  "body:delete": { bodyId: string };
  "viewport:mode": { mode: "single" | "quad" };
  "tool:activate": { pluginId: string };
  "tool:deactivate": { pluginId: string };
  "history:undo": void;
  "history:redo": void;
  "stl:export": { bodyId: string };
  "stl:import": { file: File };
}

// ── Project ──

export interface Project {
  id: string;
  name: string;
  bodies: Body[];
  sketches: Sketch[];
  createdAt: number;
  updatedAt: number;
}
