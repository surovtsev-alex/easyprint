"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, OrthographicCamera } from "@react-three/drei";
import { useCallback, useRef } from "react";
import * as THREE from "three";
import { MillimeterGrid } from "./Grid";
import { AxisIndicator, ViewCubeOverlay } from "./ViewCube";
import { PlaneSelector } from "./PlaneSelector";
import { useEditorStore } from "../store/editorStore";
import { canvasAPI } from "../api/CanvasAPI";
import { eventBus } from "../api/EventBus";

function SceneContent() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[60, 60, 60]}
        fov={50}
        near={0.1}
        far={10000}
        onUpdate={(cam) => {
          canvasAPI.setCamera(cam);
        }}
      />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={500}
      />
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 100, 50]} intensity={0.8} castShadow />
      <directionalLight position={[-50, 50, -50]} intensity={0.3} />
      <MillimeterGrid />
      <AxisIndicator />
    </>
  );
}

function QuadSceneContent({
  view,
}: {
  view: "perspective" | "top" | "front" | "right";
}) {
  const camPositions: Record<string, [number, number, number]> = {
    perspective: [60, 60, 60],
    top: [0, 100, 0],
    front: [0, 0, 100],
    right: [100, 0, 0],
  };

  const isOrtho = view !== "perspective";
  const pos = camPositions[view];

  return (
    <>
      {isOrtho ? (
        <OrthographicCamera
          makeDefault
          position={pos}
          zoom={3}
          near={0.1}
          far={10000}
        />
      ) : (
        <PerspectiveCamera
          makeDefault
          position={pos}
          fov={50}
          near={0.1}
          far={10000}
        />
      )}
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        enableRotate={!isOrtho}
      />
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 100, 50]} intensity={0.8} />
      <MillimeterGrid />
      <AxisIndicator />
    </>
  );
}

export function ViewportManager() {
  const viewportMode = useEditorStore((s) => s.viewportMode);
  const showPlaneSelector = useEditorStore((s) => s.showPlaneSelector);
  const setShowPlaneSelector = useEditorStore((s) => s.setShowPlaneSelector);

  const handleViewChange = useCallback((position: THREE.Vector3) => {
    canvasAPI.setCameraPosition(position, new THREE.Vector3(0, 0, 0));
  }, []);

  const handlePlaneSelect = useCallback(
    (plane: "XY" | "XZ" | "YZ") => {
      setShowPlaneSelector(false);
      useEditorStore.getState().setSketchPlane(plane);
      useEditorStore.getState().setMode("sketch");
      eventBus.emit("sketch:start", { plane });
    },
    [setShowPlaneSelector]
  );

  const handlePlaneCancel = useCallback(() => {
    setShowPlaneSelector(false);
  }, [setShowPlaneSelector]);

  const canvasProps = {
    className: "w-full h-full" as string,
    gl: { antialias: true, alpha: false },
    onCreated: ({ scene }: { scene: THREE.Scene }) => {
      scene.background = new THREE.Color(0x1a1a2e);
      canvasAPI.setScene(scene);
    },
  };

  if (viewportMode === "quad") {
    const views = ["perspective", "top", "front", "right"] as const;
    const labels = ["Perspective", "Top", "Front", "Right"];

    return (
      <div className="relative w-full h-full">
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-px bg-gray-700">
          {views.map((view, i) => (
            <div key={view} className="relative">
              <div className="absolute top-1 left-2 z-10 text-gray-400 text-xs font-medium">
                {labels[i]}
              </div>
              <Canvas {...canvasProps}>
                <QuadSceneContent view={view} />
              </Canvas>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <Canvas {...canvasProps}>
        <SceneContent />
      </Canvas>
      <ViewCubeOverlay onViewChange={handleViewChange} />
      {showPlaneSelector && (
        <PlaneSelector
          onSelect={handlePlaneSelect}
          onCancel={handlePlaneCancel}
        />
      )}
    </div>
  );
}
