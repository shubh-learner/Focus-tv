export type Direction = "up" | "down" | "left" | "right";

export type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type FocusCandidate = {
  id: string;
  rect: RectLike;
};

export function pickNextFocus(
  current: RectLike,
  candidates: FocusCandidate[],
  direction: Direction
): string | null {
  const cx = (current.left + current.right) / 2;
  const cy = (current.top + current.bottom) / 2;
  const horizontal = direction === "left" || direction === "right";
  const sign = direction === "right" || direction === "down" ? 1 : -1;

  let best: { id: string; score: number } | null = null;

  for (const candidate of candidates) {
    const candidateX = (candidate.rect.left + candidate.rect.right) / 2;
    const candidateY = (candidate.rect.top + candidate.rect.bottom) / 2;
    const primary = ((horizontal ? candidateX - cx : candidateY - cy) * sign);
    if (primary <= 1) continue;

    const secondary = Math.abs(horizontal ? candidateY - cy : candidateX - cx);
    const score = primary + secondary * 2;

    if (!best || score < best.score) {
      best = { id: candidate.id, score };
    }
  }

  return best?.id ?? null;
}
