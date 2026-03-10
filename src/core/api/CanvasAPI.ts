import * as THREE from "three";
import type { Body, Sketch, SketchPrimitive, SketchProfile } from "./types";
import { v4 as uuidv4 } from "uuid";

export class CanvasAPI {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private bodies: Map<string, Body> = new Map();
  private sketches: Map<string, Sketch> = new Map();
  private sketchVisuals: Map<string, THREE.Group> = new Map();

  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  getScene(): THREE.Scene | null {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }

  // ── Body Management ──

  addBody(name: string, mesh: THREE.Mesh): Body {
    const body: Body = {
      id: uuidv4(),
      name,
      mesh,
      operations: [],
      visible: true,
    };
    this.bodies.set(body.id, body);
    this.scene?.add(mesh);
    mesh.userData.bodyId = body.id;
    return body;
  }

  removeBody(bodyId: string): void {
    const body = this.bodies.get(bodyId);
    if (body) {
      this.scene?.remove(body.mesh);
      body.mesh.geometry.dispose();
      if (body.mesh.material instanceof THREE.Material) {
        body.mesh.material.dispose();
      }
      this.bodies.delete(bodyId);
    }
  }

  getBody(bodyId: string): Body | undefined {
    return this.bodies.get(bodyId);
  }

  getAllBodies(): Body[] {
    return Array.from(this.bodies.values());
  }

  updateBodyMesh(bodyId: string, newMesh: THREE.Mesh): void {
    const body = this.bodies.get(bodyId);
    if (body) {
      this.scene?.remove(body.mesh);
      body.mesh.geometry.dispose();
      body.mesh = newMesh;
      this.scene?.add(newMesh);
      newMesh.userData.bodyId = bodyId;
    }
  }

  // ── Sketch Management ──

  createSketch(plane: "XY" | "XZ" | "YZ", offset = 0): Sketch {
    const sketch: Sketch = {
      id: uuidv4(),
      plane,
      planeOffset: offset,
      primitives: [],
      profiles: [],
    };
    this.sketches.set(sketch.id, sketch);
    return sketch;
  }

  addPrimitive(sketchId: string, primitive: SketchPrimitive): void {
    const sketch = this.sketches.get(sketchId);
    if (sketch) {
      sketch.primitives.push(primitive);
    }
  }

  getSketch(sketchId: string): Sketch | undefined {
    return this.sketches.get(sketchId);
  }

  getAllSketches(): Sketch[] {
    return Array.from(this.sketches.values());
  }

  setProfiles(sketchId: string, profiles: SketchProfile[]): void {
    const sketch = this.sketches.get(sketchId);
    if (sketch) {
      sketch.profiles = profiles;
    }
  }

  updatePrimitive(sketchId: string, index: number, primitive: SketchPrimitive): void {
    const sketch = this.sketches.get(sketchId);
    if (sketch && index >= 0 && index < sketch.primitives.length) {
      sketch.primitives[index] = primitive;
    }
  }

  removePrimitive(sketchId: string, index: number): void {
    const sketch = this.sketches.get(sketchId);
    if (sketch && index >= 0 && index < sketch.primitives.length) {
      sketch.primitives.splice(index, 1);
    }
  }

  // ── Sketch Visuals (persistent) ──

  storeSketchVisual(sketchId: string, group: THREE.Group): void {
    this.sketchVisuals.set(sketchId, group);
  }

  getSketchVisual(sketchId: string): THREE.Group | undefined {
    return this.sketchVisuals.get(sketchId);
  }

  removeSketchVisual(sketchId: string): void {
    const group = this.sketchVisuals.get(sketchId);
    if (group) {
      this.scene?.remove(group);
      this.sketchVisuals.delete(sketchId);
    }
  }

  // ── Camera Helpers ──

  setCameraPosition(position: THREE.Vector3, lookAt?: THREE.Vector3): void {
    if (this.camera) {
      this.camera.position.copy(position);
      if (lookAt) {
        this.camera.lookAt(lookAt);
      }
    }
  }

  setCameraToPlane(plane: "XY" | "XZ" | "YZ"): void {
    const dist = 100;
    switch (plane) {
      case "XY":
        this.setCameraPosition(
          new THREE.Vector3(0, 0, dist),
          new THREE.Vector3(0, 0, 0)
        );
        break;
      case "XZ":
        this.setCameraPosition(
          new THREE.Vector3(0, dist, 0),
          new THREE.Vector3(0, 0, 0)
        );
        break;
      case "YZ":
        this.setCameraPosition(
          new THREE.Vector3(dist, 0, 0),
          new THREE.Vector3(0, 0, 0)
        );
        break;
    }
  }

  // ── Raycasting ──

  raycast(
    mouse: THREE.Vector2,
    objects?: THREE.Object3D[]
  ): THREE.Intersection[] {
    if (!this.camera || !this.scene) return [];
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const targets = objects || this.scene.children;
    return raycaster.intersectObjects(targets, true);
  }

  // ── Helpers ──

  addHelper(helper: THREE.Object3D): void {
    this.scene?.add(helper);
  }

  removeHelper(helper: THREE.Object3D): void {
    this.scene?.remove(helper);
  }
}

export const canvasAPI = new CanvasAPI();
