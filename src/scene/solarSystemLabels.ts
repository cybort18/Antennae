/**
 * Screen-space label priority and collision resolution for the Solar System Overview.
 *
 * This module is strictly presentation-only and framework-independent. It
 * computes deterministic visibility and collision suppression for projected DOM
 * labels without altering 3D body positions, orbit guides, or simulation state.
 */

import type { SolarSystemBodyId } from '../solarSystem/bodies';

export const LABEL_COLLISION_MARGIN_PX = 2;
export const COMPACT_LABEL_VIEWPORT_MAX_WIDTH_PX = 620;

/**
 * Deterministic label priority order when a body is not the active selection.
 * The selected body always takes top priority (rank 0), followed by the Sun,
 * Earth, the four outer giant planets, the inner terrestrial planets from
 * outer (less crowded) to inner (most crowded near the Sun), and small bodies.
 */
export const DEFAULT_LABEL_PRIORITY_ORDER: readonly SolarSystemBodyId[] = [
  'sun',
  'earth',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'mars',
  'venus',
  'mercury',
  'bennu',
];

export const FALLBACK_LABEL_DIMENSIONS: Readonly<
  Record<SolarSystemBodyId, { readonly width: number; readonly height: number }>
> = {
  sun: { width: 47, height: 20 },
  mercury: { width: 71, height: 20 },
  venus: { width: 59, height: 20 },
  earth: { width: 59, height: 20 },
  mars: { width: 53, height: 20 },
  jupiter: { width: 71, height: 20 },
  saturn: { width: 65, height: 20 },
  uranus: { width: 65, height: 20 },
  neptune: { width: 71, height: 20 },
  bennu: { width: 108, height: 20 },
};

export type ProjectedLabelCandidate = {
  id: SolarSystemBodyId;
  x: number;
  y: number;
  width: number;
  height: number;
  inFrustum: boolean;
};

export type LabelBoundingBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type ResolvedLabelLayout = {
  id: SolarSystemBodyId;
  x: number;
  y: number;
  width: number;
  height: number;
  inFrustum: boolean;
  visible: boolean;
  suppressed: boolean;
};

export function labelBoundingBox(
  candidate: Pick<ProjectedLabelCandidate, 'x' | 'y' | 'width' | 'height'>,
): LabelBoundingBox {
  const halfWidth = candidate.width * 0.5;
  return {
    left: candidate.x - halfWidth,
    top: candidate.y - candidate.height,
    right: candidate.x + halfWidth,
    bottom: candidate.y,
  };
}

export function labelsOverlap(
  a: LabelBoundingBox,
  b: LabelBoundingBox,
  marginPx = 0,
): boolean {
  return (
    a.left < b.right + marginPx &&
    a.right + marginPx > b.left &&
    a.top < b.bottom + marginPx &&
    a.bottom + marginPx > b.top
  );
}

export function labelPriorityOrder(
  selectedId: SolarSystemBodyId,
): SolarSystemBodyId[] {
  return [
    selectedId,
    ...DEFAULT_LABEL_PRIORITY_ORDER.filter((id) => id !== selectedId),
  ];
}

/**
 * Pure, deterministic screen-space collision resolver for projected Solar System
 * labels. Keeps the selected body's label visible whenever it is inside the
 * viewport frustum and suppresses lower-priority non-selected labels whose
 * bounding boxes overlap an already-accepted higher-priority label.
 */
export function resolveSolarSystemLabelCollisions(
  candidates: readonly ProjectedLabelCandidate[],
  selectedId: SolarSystemBodyId,
  options?: {
    marginPx?: number;
    singleSelectedLabelOnly?: boolean;
    out?: ResolvedLabelLayout[];
  },
): ResolvedLabelLayout[] {
  const marginPx = options?.marginPx ?? LABEL_COLLISION_MARGIN_PX;
  const singleSelectedLabelOnly = options?.singleSelectedLabelOnly ?? false;
  const count = candidates.length;
  const result = options?.out ?? new Array<ResolvedLabelLayout>(count);

  for (let i = 0; i < count; i += 1) {
    const candidate = candidates[i];
    const existing = result[i];
    if (existing) {
      existing.id = candidate.id;
      existing.x = candidate.x;
      existing.y = candidate.y;
      existing.width = candidate.width;
      existing.height = candidate.height;
      existing.inFrustum = candidate.inFrustum;
      existing.visible = false;
      existing.suppressed = false;
    } else {
      result[i] = {
        id: candidate.id,
        x: candidate.x,
        y: candidate.y,
        width: candidate.width,
        height: candidate.height,
        inFrustum: candidate.inFrustum,
        visible: false,
        suppressed: false,
      };
    }
  }
  result.length = count;

  if (singleSelectedLabelOnly) {
    for (let i = 0; i < count; i += 1) {
      const candidate = candidates[i];
      if (!candidate.inFrustum) {
        continue;
      }
      if (candidate.id === selectedId) {
        result[i].visible = true;
      } else {
        result[i].suppressed = true;
      }
    }
    return result;
  }

  const totalPrioritySteps = DEFAULT_LABEL_PRIORITY_ORDER.length + 1;
  for (let step = 0; step < totalPrioritySteps; step += 1) {
    const targetId =
      step === 0 ? selectedId : DEFAULT_LABEL_PRIORITY_ORDER[step - 1];
    if (step > 0 && targetId === selectedId) {
      continue;
    }

    for (let i = 0; i < count; i += 1) {
      const candidate = candidates[i];
      if (candidate.id !== targetId || !candidate.inFrustum) {
        continue;
      }

      const leftA = candidate.x - candidate.width * 0.5;
      const rightA = candidate.x + candidate.width * 0.5;
      const topA = candidate.y - candidate.height;
      const bottomA = candidate.y;

      let collides = false;
      for (let j = 0; j < count; j += 1) {
        const accepted = result[j];
        if (!accepted.visible) {
          continue;
        }
        const leftB = accepted.x - accepted.width * 0.5;
        const rightB = accepted.x + accepted.width * 0.5;
        const topB = accepted.y - accepted.height;
        const bottomB = accepted.y;

        if (
          leftA < rightB + marginPx &&
          rightA + marginPx > leftB &&
          topA < bottomB + marginPx &&
          bottomA + marginPx > topB
        ) {
          collides = true;
          break;
        }
      }

      if (collides) {
        result[i].visible = false;
        result[i].suppressed = true;
      } else {
        result[i].visible = true;
        result[i].suppressed = false;
      }
    }
  }

  return result;
}
