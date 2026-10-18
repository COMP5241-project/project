/**
 * Procedural animation math for the WhipScene sample-course animation.
 *
 * Everything is a pure function of a single master clock `t` (seconds), so
 * the rider's legs track the pedals exactly (two-bone IK) and the whip, the
 * impact star, and the victim's flinch all fire from the same beat phase —
 * nothing can drift out of sync.
 */

export interface Vec {
  x: number
  y: number
}

export const TWO_PI = Math.PI * 2

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** Hermite smoothstep on a clamped 0..1 input. */
export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** Damped oscillation: 1 at u=0, ringing toward 0. */
export function damped(u: number, k: number, omega: number): number {
  return Math.exp(-k * u) * Math.cos(omega * u)
}

/**
 * Two-bone IK: returns the elbow/knee position for joint `j` reaching target
 * `tgt` with segment lengths a (upper) and b (lower). `bend` = +1 or -1 picks
 * which side the joint bends (documented per call site; for the bicycle legs
 * -1 puts the knee forward of the hip→foot line). If the target is farther
 * than a+b the arm is clamped to full extension (never floats).
 */
export function twoBoneIK(j: Vec, tgt: Vec, a: number, b: number, bend: 1 | -1): Vec {
  let dx = tgt.x - j.x
  let dy = tgt.y - j.y
  let d = Math.hypot(dx, dy)
  const maxD = a + b - 0.01
  if (d > maxD) {
    dx *= maxD / d
    dy *= maxD / d
    d = maxD
  }
  const minD = Math.abs(a - b) + 0.01
  const dd = Math.max(d, minD)
  const cosA = (a * a + dd * dd - b * b) / (2 * a * dd)
  const alpha = Math.acos(Math.min(1, Math.max(-1, cosA)))
  const base = Math.atan2(dy, dx)
  const ang = base + bend * alpha
  return { x: j.x + a * Math.cos(ang), y: j.y + a * Math.sin(ang) }
}

/** Straight segment path with rounded caps supplied by the stroke. */
export const segPath = (a: Vec, b: Vec): string =>
  `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`

/** Catmull-Rom spline through the points as cubic Béziers (smooth whip lash). */
export function smoothPath(pts: Vec[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

/** Seconds per full whip beat (hang → cock → crack → settle). */
export const WHIP_BEAT = 1.6

const COCK_START = 0.4
const CRACK_START = 0.52
const SETTLE_START = 0.58

export interface WhipPose {
  /** Grip position in the parent group's coordinates. */
  grip: Vec
  /** Angle (rad) the lash points at rest (its idle hang direction). */
  restAngle: number
  /** Angle the tip points at while cocked back. */
  cockAngle: number
  /** Angle the tip points at the instant of the crack. */
  crackAngle: number
  /** Lash length at rest. */
  length: number
  /** Idle tip-sway amplitude (rad, 0 to keep it still). */
  sway?: number
  /** Sample points along the chain (including the grip). */
  segments?: number
}

/**
 * The whip is a chain of short segments whose direction eases from the rest
 * pose, bows while cocking (tip leads the grip), snaps taut with a traveling
 * wave during the crack, and settles with a damped spring. Returns world
 * points from grip to tip.
 *
 * Angles must be within ~π of each other (no wrap-around) — all scenes use
 * local frames where rest/cock/crack stay inside one half-circle.
 */
export function lashPoints(w: WhipPose, t: number): Vec[] {
  const n = w.segments ?? 9
  const u = (t % WHIP_BEAT) / WHIP_BEAT
  const sway = w.sway ?? 0

  const dirAt = (s: number): number => {
    // Idle sway: the tip lags and sways most.
    const rest = w.restAngle + sway * Math.sin(t * 1.9 - s * 2.6) * s * s
    if (u < COCK_START) return rest
    if (u < CRACK_START) {
      const c = smoothstep((u - COCK_START) / (CRACK_START - COCK_START))
      // Bow: the tip leads the grip while cocking.
      return lerp(w.restAngle + sway * Math.sin(t * 1.9 - s * 2.6) * s * s, w.cockAngle, c * (0.3 + 0.7 * s))
    }
    if (u < SETTLE_START) {
      // Traveling crack wave: segments ahead of the front are taut, behind
      // it they are still cocked.
      const front = (u - CRACK_START) / (SETTLE_START - CRACK_START)
      const band = 0.22
      const local = (s - (front - band)) / (2 * band)
      const snapped = local <= 0 ? 1 : local >= 1 ? 0 : 1 - smoothstep(local)
      return lerp(w.cockAngle, w.crackAngle, snapped)
    }
    // Settle: damped spring back to the hang.
    const d = (u - SETTLE_START) / (1 - SETTLE_START)
    const osc = damped(d, 4.5, 11) * (1 - s * 0.45)
    return lerp(w.restAngle, w.crackAngle, Math.max(-0.4, Math.min(1.4, osc)))
  }

  const pts: Vec[] = [w.grip]
  const stretch = u >= CRACK_START && u < SETTLE_START ? 1.05 : 1
  const segLen = (w.length * stretch) / (n - 1)
  let p = w.grip
  for (let i = 1; i < n; i++) {
    const a = dirAt(i / (n - 1))
    p = { x: p.x + segLen * Math.cos(a), y: p.y + segLen * Math.sin(a) }
    pts.push(p)
  }
  return pts
}

/**
 * Impact pulse shared by the victim's whiplash, flinch, and the impact star.
 * Rises fast when the lash lands (≈ crack mid-phase) then decays with a
 * small rebound. Returns 0..~1.
 */
export function impactPulse(t: number): number {
  const u = (t % WHIP_BEAT) / WHIP_BEAT
  const start = 0.545
  if (u < start || u > 0.95) return 0
  const d = (u - start) / 0.405
  const rise = smoothstep(Math.min(1, d / 0.1))
  return rise * (0.55 + 0.45 * damped(Math.max(0, d - 0.1), 4, 8))
}

// --- whip-anim chunk 3 ---