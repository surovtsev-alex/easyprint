"use client";

import { useMemo } from "react";
import * as THREE from "three";

export function MillimeterGrid() {
  const gridGeometry = useMemo(() => {
    const size = 200; // 200mm total
    const divisions = 200; // 1mm per division
    const majorDivisions = 10; // bold line every 10mm

    const vertices: number[] = [];
    const colors: number[] = [];

    const half = size / 2;
    const step = size / divisions;
    const majorColor = new THREE.Color(0.35, 0.35, 0.35);
    const minorColor = new THREE.Color(0.2, 0.2, 0.2);

    for (let i = 0; i <= divisions; i++) {
      const pos = -half + i * step;
      const isMajor = i % majorDivisions === 0;
      const color = isMajor ? majorColor : minorColor;

      // X-axis lines
      vertices.push(-half, 0, pos, half, 0, pos);
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);

      // Z-axis lines
      vertices.push(pos, 0, -half, pos, 0, half);
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );
    return geometry;
  }, []);

  return (
    <lineSegments geometry={gridGeometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.6} />
    </lineSegments>
  );
}
