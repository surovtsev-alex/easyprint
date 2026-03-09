"use client";

import { useCallback } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

const FACE_POSITIONS: Record<string, [number, number, number]> = {
  Front: [0, 0, 100],
  Back: [0, 0, -100],
  Top: [0, 100, 0],
  Bottom: [0, -100, 0],
  Right: [100, 0, 0],
  Left: [-100, 0, 0],
};

interface ViewCubeProps {
  onViewChange?: (position: THREE.Vector3) => void;
}

export function ViewCubeOverlay({ onViewChange }: ViewCubeProps) {
  const handleClick = useCallback(
    (face: string) => {
      const pos = FACE_POSITIONS[face];
      if (pos && onViewChange) {
        onViewChange(new THREE.Vector3(...pos));
      }
    },
    [onViewChange]
  );

  return (
    <div className="absolute top-4 right-4 z-10 select-none">
      <div
        className="relative w-[80px] h-[80px]"
        style={{ perspective: "200px" }}
      >
        <div
          className="w-full h-full relative"
          style={{
            transformStyle: "preserve-3d",
            transform: "rotateX(-20deg) rotateY(-30deg)",
          }}
        >
          {/* Front */}
          <CubeFace
            label="F"
            transform="translateZ(40px)"
            onClick={() => handleClick("Front")}
          />
          {/* Back */}
          <CubeFace
            label="Bk"
            transform="translateZ(-40px) rotateY(180deg)"
            onClick={() => handleClick("Back")}
          />
          {/* Top */}
          <CubeFace
            label="T"
            transform="translateY(-40px) rotateX(90deg)"
            onClick={() => handleClick("Top")}
          />
          {/* Bottom */}
          <CubeFace
            label="Bt"
            transform="translateY(40px) rotateX(-90deg)"
            onClick={() => handleClick("Bottom")}
          />
          {/* Right */}
          <CubeFace
            label="R"
            transform="translateX(40px) rotateY(90deg)"
            onClick={() => handleClick("Right")}
          />
          {/* Left */}
          <CubeFace
            label="L"
            transform="translateX(-40px) rotateY(-90deg)"
            onClick={() => handleClick("Left")}
          />
        </div>
      </div>
    </div>
  );
}

function CubeFace({
  label,
  transform,
  onClick,
}: {
  label: string;
  transform: string;
  onClick: () => void;
}) {
  return (
    <div
      className="absolute w-[80px] h-[80px] flex items-center justify-center border border-gray-500/50 bg-gray-800/80 text-gray-200 text-xs font-bold cursor-pointer hover:bg-blue-600/80 transition-colors"
      style={{ transform, backfaceVisibility: "hidden" }}
      onClick={onClick}
    >
      {label}
    </div>
  );
}

// Axis indicator that shows X, Y, Z directions
export function AxisIndicator() {
  return (
    <group>
      {/* X axis - Red */}
      <arrowHelper
        args={[
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(0, 0, 0),
          10,
          0xff4444,
          2,
          1.5,
        ]}
      />
      {/* Y axis - Green */}
      <arrowHelper
        args={[
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, 0, 0),
          10,
          0x44ff44,
          2,
          1.5,
        ]}
      />
      {/* Z axis - Blue */}
      <arrowHelper
        args={[
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 0, 0),
          10,
          0x4444ff,
          2,
          1.5,
        ]}
      />
    </group>
  );
}
