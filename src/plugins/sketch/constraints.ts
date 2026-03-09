import type { SketchPrimitive, SketchLine, SketchProfile } from "@/core/api/types";

const SNAP_THRESHOLD = 2; // mm

export function snapToHorizontal(line: SketchLine): SketchLine {
  if (Math.abs(line.end[1] - line.start[1]) < SNAP_THRESHOLD) {
    return { ...line, end: [line.end[0], line.start[1]] };
  }
  return line;
}

export function snapToVertical(line: SketchLine): SketchLine {
  if (Math.abs(line.end[0] - line.start[0]) < SNAP_THRESHOLD) {
    return { ...line, end: [line.start[0], line.end[1]] };
  }
  return line;
}

export function snapPoint(
  point: [number, number],
  primitives: SketchPrimitive[],
  threshold = SNAP_THRESHOLD
): [number, number] {
  for (const prim of primitives) {
    if (prim.type === "line") {
      if (dist(point, prim.start) < threshold) return [...prim.start];
      if (dist(point, prim.end) < threshold) return [...prim.end];
    } else if (prim.type === "rectangle") {
      const corners = getRectCorners(prim.origin, prim.width, prim.height);
      for (const corner of corners) {
        if (dist(point, corner) < threshold) return [...corner];
      }
    } else if (prim.type === "circle") {
      if (dist(point, prim.center) < threshold) return [...prim.center];
    }
  }
  return point;
}

function dist(a: [number, number], b: [number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

function getRectCorners(
  origin: [number, number],
  w: number,
  h: number
): [number, number][] {
  return [
    origin,
    [origin[0] + w, origin[1]],
    [origin[0] + w, origin[1] + h],
    [origin[0], origin[1] + h],
  ];
}

export function detectProfiles(primitives: SketchPrimitive[]): SketchProfile[] {
  // Simple profile detection: if we have a rectangle, it's automatically a closed profile
  // For lines, we check if they form a closed loop
  const profiles: SketchProfile[] = [];

  // Check for rectangles and circles - they are automatically closed profiles
  primitives.forEach((prim, idx) => {
    if (prim.type === "rectangle" || prim.type === "circle") {
      profiles.push({
        id: `profile_${idx}`,
        edges: [idx],
        closed: true,
      });
    }
  });

  // Check for closed line loops
  const lines = primitives
    .map((p, i) => ({ prim: p, idx: i }))
    .filter((p) => p.prim.type === "line");

  if (lines.length >= 3) {
    const visited = new Set<number>();
    for (const start of lines) {
      if (visited.has(start.idx)) continue;

      const loop = findLoop(
        start.idx,
        primitives as SketchPrimitive[],
        lines.map((l) => l.idx)
      );
      if (loop && loop.length >= 3) {
        loop.forEach((i) => visited.add(i));
        profiles.push({
          id: `profile_loop_${start.idx}`,
          edges: loop,
          closed: true,
        });
      }
    }
  }

  return profiles;
}

function findLoop(
  startIdx: number,
  primitives: SketchPrimitive[],
  lineIndices: number[]
): number[] | null {
  const start = primitives[startIdx];
  if (start.type !== "line") return null;

  const path = [startIdx];
  let currentEnd = start.end;
  const visited = new Set([startIdx]);

  for (let iter = 0; iter < lineIndices.length; iter++) {
    let found = false;
    for (const idx of lineIndices) {
      if (visited.has(idx)) continue;
      const line = primitives[idx];
      if (line.type !== "line") continue;

      if (dist(currentEnd, line.start) < SNAP_THRESHOLD) {
        path.push(idx);
        visited.add(idx);
        currentEnd = line.end;
        found = true;

        // Check if we've closed the loop
        if (dist(currentEnd, start.start) < SNAP_THRESHOLD) {
          return path;
        }
        break;
      }
      if (dist(currentEnd, line.end) < SNAP_THRESHOLD) {
        path.push(idx);
        visited.add(idx);
        currentEnd = line.start;
        found = true;

        if (dist(currentEnd, start.start) < SNAP_THRESHOLD) {
          return path;
        }
        break;
      }
    }
    if (!found) break;
  }

  return null;
}
