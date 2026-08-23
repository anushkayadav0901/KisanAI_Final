/**
 * utils/ring.ts — keep hand-drawn field boundaries geometrically valid
 *
 * Farmers tap plot corners in whatever order feels natural — often a zig-zag
 * ("Z" order across four corners), which produces a self-crossing bow-tie
 * polygon. Area math on a crossed ring is garbage. When a ring self-
 * intersects we re-order the same corners by angle around their centroid,
 * which recovers the intended simple shape for the overwhelmingly common
 * case of convex plots. Deliberately concave shapes can still be drawn by
 * tapping in rotational order (or with Undo).
 */

export type LngLat = [number, number];

/** Cross-product orientation test for segment intersection. */
function segmentsIntersect(
  p1: LngLat,
  p2: LngLat,
  p3: LngLat,
  p4: LngLat,
): boolean {
  const d = (
    a: LngLat,
    b: LngLat,
    c: LngLat,
  ): number => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);

  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
         ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** True if the closed ring has no crossing segments. */
export function isSimple(ring: LngLat[]): boolean {
  const n = ring.length;
  if (n < 4) return true;

  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      // Segments that share an endpoint are not crossings
      if (i === 0 && j === n - 1) continue;
      const a1 = ring[i]!;
      const a2 = ring[(i + 1) % n]!;
      const b1 = ring[j]!;
      const b2 = ring[(j + 1) % n]!;
      if (segmentsIntersect(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}

/** Re-order corners angularly around the centroid. */
export function orderByAngle(ring: LngLat[]): LngLat[] {
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return [...ring].sort(
    (a, b) =>
      Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx),
  );
}

/** The ring to render/save: click order when valid, corrected otherwise. */
export function simpleRing(ring: LngLat[]): LngLat[] {
  return ring.length >= 4 && !isSimple(ring) ? orderByAngle(ring) : ring;
}
