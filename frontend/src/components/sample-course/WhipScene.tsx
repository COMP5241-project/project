import { useEffect, useRef } from 'react'
import {
  type Vec,
  TWO_PI,
  WHIP_BEAT,
  impactPulse,
  lerp,
  lashPoints,
  smoothstep,
  type WhipPose,
  segPath,
  smoothPath,
  twoBoneIK,
} from '../../lib/whip-anim'

/**
 * Inline-SVG "whip animation" scenes for the Prompt stage.
 *
 * Both variants share the exact same stage and character art — the only
 * difference is who rides whom. Characters and the whip are animated
 * procedurally from a single master clock (requestAnimationFrame writing SVG
 * attributes), so the rider's feet track the pedals exactly (two-bone IK)
 * and the whip's crack, the impact star, and the victim's flinch all fire
 * from the same beat phase. Sun, clouds, road, and wheel spin stay
 * CSS-driven (seamless loops).
 *
 *   variant="precise" — a person rides a bicycle, whip swinging forward
 *   variant="vague"   — a bicycle rides on top of a person, whip cracking down
 */

interface WhipSceneProps {
  variant: 'vague' | 'precise'
}

/** A frame's worth of attributes, keyed by the element's data-part name. */
type Attrs = Record<string, Record<string, string>>

const deg = (rad: number): number => (rad * 180) / Math.PI

// A calm mid-hang instant used for the initial render and for
// prefers-reduced-motion static frames.
const T0 = 0.3

export function WhipScene({ variant }: WhipSceneProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const attrs = variant === 'precise' ? preciseAttrs(T0) : vagueAttrs(T0)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const parts: Record<string, SVGElement> = {}
    svg.querySelectorAll<SVGElement>('[data-part]').forEach((el) => {
      const name = el.getAttribute('data-part')
      if (name) parts[name] = el
    })
    const paint = (t: number) => {
      const a = variant === 'precise' ? preciseAttrs(t) : vagueAttrs(t)
      for (const name in a) {
        const el = parts[name]
        if (!el) continue
        for (const attribute in a[name]) {
          el.setAttribute(attribute, a[name][attribute])
        }
      }
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paint(T0) // static, legible pose — no loop
      return
    }

    let raf = 0
    let visible = true
    const start = performance.now()
    const tick = (now: number) => {
      if (visible) {
        paint((now - start) / 1000)
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(tick)
      else if (!visible && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    })
    io.observe(svg)
    return () => {
      io.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [variant])

  const label =
    variant === 'precise'
      ? 'Animation: a person rides a bicycle from left to right, sitting on top of the bike, swinging a whip forward.'
      : 'Animation: a bicycle rides on top of a person, who struggles on the ground while a whip cracks down on them.'

  return (
    <div className="whip-scene overflow-hidden rounded-lg border border-gray-200 bg-white" role="img" aria-label={label}>
      <svg ref={svgRef} viewBox="0 0 800 400" className="block h-auto w-full">
        <defs>
          <linearGradient id={`whip-sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F3FAFF" />
            <stop offset="1" stopColor="#D9ECF8" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill={`url(#whip-sky-${variant})`} />
        <Sun />
        <Clouds />
        <Hills />
        <Road />
        {variant === 'precise' ? <PreciseScene a0={attrs} /> : <VagueScene a0={attrs} />}
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Precise scene — a rider who is actually riding                      */
/* ------------------------------------------------------------------ */

const CADENCE = 1.2 // seconds per crank revolution
const CRANK_P: Vec = { x: 410, y: 306 }
const PEDAL_R = 24
const HIP_P: Vec = { x: 385, y: 236 }
const SHOULDER_P: Vec = { x: 402, y: 196 }
const HAND_REST: Vec = { x: 454, y: 230 }
const HAND_BACK: Vec = { x: 432, y: 222 } // drawn back toward the body
const HAND_FWD: Vec = { x: 470, y: 238 } // driven forward past the bars
const UPPER_ARM = 32
const FORE_ARM = 30
const WHIP_P: WhipPose = {
  grip: HAND_REST,
  restAngle: -0.5, // held out forward, slightly up
  cockAngle: -2.6, // drawn back behind the rider
  crackAngle: 0.55, // snapped forward-down
  length: 58,
  sway: 0.06,
}

/**
 * The right hand keyframed over the whip beat: at the bars, drawn back while
 * the lash cocks, driven forward as the crack extends the arm, then eased
 * back to rest — the classic wind-up telegraph.
 */
function preciseHand(t: number): Vec {
  const u = (t % WHIP_BEAT) / WHIP_BEAT
  if (u < 0.4) return HAND_REST
  if (u < 0.52) {
    const c = smoothstep((u - 0.4) / 0.12)
    return { x: lerp(HAND_REST.x, HAND_BACK.x, c), y: lerp(HAND_REST.y, HAND_BACK.y, c) }
  }
  if (u < 0.58) {
    const c = smoothstep((u - 0.52) / 0.06)
    return { x: lerp(HAND_BACK.x, HAND_FWD.x, c), y: lerp(HAND_BACK.y, HAND_FWD.y, c) }
  }
  if (u < 0.76) {
    const c = smoothstep((u - 0.58) / 0.18)
    return { x: lerp(HAND_FWD.x, HAND_REST.x, c), y: lerp(HAND_FWD.y, HAND_REST.y, c) }
  }
  return HAND_REST
}

const footAngle = (knee: Vec, foot: Vec): number =>
  Math.max(-30, Math.min(30, deg(Math.atan2(foot.y - knee.y, foot.x - knee.x))))

function preciseAttrs(t: number): Attrs {
  const theta = (TWO_PI * t) / CADENCE
  // SVG rotate(θ) maps the bottom pedal (0,24) → (-24 sinθ, 24 cosθ), so the
  // IK targets must use that convention or the feet would chase a phantom pedal.
  const px = -PEDAL_R * Math.sin(theta)
  const py = PEDAL_R * Math.cos(theta)
  const pedalF: Vec = { x: CRANK_P.x + px, y: CRANK_P.y + py }
  const pedalB: Vec = { x: CRANK_P.x - px, y: CRANK_P.y - py }
  const bob = 2.2 * Math.cos(2 * theta) // pedaling verticality, twice per rev
  const hip: Vec = { x: HIP_P.x, y: HIP_P.y + bob }
  const shoulder: Vec = { x: SHOULDER_P.x, y: SHOULDER_P.y + bob }
  const handBase = preciseHand(t)
  const hand: Vec = { x: handBase.x, y: handBase.y + bob }
  // Two-bone arm: the elbow solves from shoulder to the beat-driven hand.
  const elbow = twoBoneIK(shoulder, hand, UPPER_ARM, FORE_ARM, 1)

  // Both legs solve IK to their pedal every frame — feet never leave.
  const kneeF = twoBoneIK(hip, pedalF, 48, 48, -1)
  const kneeB = twoBoneIK(hip, pedalB, 48, 48, -1)

  const u = (t % WHIP_BEAT) / WHIP_BEAT
  const pts = lashPoints({ ...WHIP_P, grip: hand }, t)
  const tip = pts[pts.length - 1]
  const streak = u > 0.5 && u < 0.66 ? Math.sin(Math.PI * ((u - 0.5) / 0.16)) : 0

  return {
    crank: { transform: `rotate(${deg(theta).toFixed(2)})` },
    rider: { transform: `translate(0 ${bob.toFixed(2)})` },
    'thigh-f': { d: segPath(hip, kneeF) },
    'shin-f': { d: segPath(kneeF, pedalF) },
    'foot-f': { transform: `translate(${pedalF.x.toFixed(1)} ${pedalF.y.toFixed(1)}) rotate(${footAngle(kneeF, pedalF).toFixed(1)})` },
    'thigh-b': { d: segPath(hip, kneeB) },
    'shin-b': { d: segPath(kneeB, pedalB) },
    'foot-b': { transform: `translate(${pedalB.x.toFixed(1)} ${pedalB.y.toFixed(1)}) rotate(${footAngle(kneeB, pedalB).toFixed(1)})` },
    // Far-side (left) arm stays put on the bars while the right arm whips.
    'arm-b': { d: segPath({ x: 398, y: 195 + bob }, { x: 442, y: 228 + bob }) },
    'hand-b': { transform: `translate(442 ${(228 + bob).toFixed(1)})` },
    'upper-arm': { d: segPath(shoulder, elbow) },
    'lower-arm': { d: segPath(elbow, hand) },
    hand: { transform: `translate(${hand.x.toFixed(1)} ${hand.y.toFixed(1)})` },
    whip: { d: smoothPath(pts) },
    'whip-wide': { d: smoothPath(pts.slice(0, 5)) },
    'whip-tip': { transform: `translate(${tip.x.toFixed(1)} ${tip.y.toFixed(1)})` },
    'whip-streak': { opacity: streak.toFixed(2) },
  }
}

/* ------------------------------------------------------------------ */
/* Vague scene — a bicycle that rides a struggling person              */
/* ------------------------------------------------------------------ */

const BIKE_V = { x: 430, y: 240 } // bike group origin (crank position)
const WHIP_V: WhipPose = {
  grip: { x: -8, y: -16 }, // on the frame, in bike-local coordinates
  restAngle: Math.PI / 2 + 0.1, // hanging over the victim's face
  cockAngle: Math.PI / 2 + 2.5, // swept up and back
  crackAngle: Math.PI / 2 - 0.25, // slapped straight down
  length: 46,
  sway: 0.05,
}
const SH_V: Vec = { x: 430, y: 282 } // victim's shoulder
const HIP_V: Vec = { x: 428, y: 306 } // victim's hip

function vagueAttrs(t: number): Attrs {
  // Uncontrolled lurch: incommensurate sines so it never looks looped.
  const jx = 3 * Math.sin(5.3 * t)
  const jy = 2.5 * Math.sin(7.1 * t + 1)
  const jr = 1.5 * Math.sin(4.7 * t + 2)

  // Everything the victim does reacts to the whip's crack, from the same beat.
  const pulse = impactPulse(t)
  const headRot = 18 * pulse
  const flinch = 10 * pulse

  // Arms: Lissajous flailing, flinching outward on impact.
  const handL: Vec = { x: SH_V.x - 26 - 10 * Math.sin(3.3 * t) - flinch, y: SH_V.y - 22 - 8 * Math.cos(2.2 * t + 1) }
  const handR: Vec = { x: SH_V.x + 26 + 9 * Math.sin(2.9 * t + 2) + flinch, y: SH_V.y - 20 - 8 * Math.cos(2.6 * t + 4) }
  const elbowL = twoBoneIK(SH_V, handL, 20, 18, 1)
  const elbowR = twoBoneIK(SH_V, handR, 20, 18, -1)

  // Legs scrabbling at the ground.
  const footL: Vec = { x: 396 + 5 * Math.sin(6.2 * t), y: 344 }
  const footR: Vec = { x: 464 + 5 * Math.sin(6.2 * t + 2.4), y: 344 }
  const kneeL = twoBoneIK(HIP_V, footL, 30, 28, -1)
  const kneeR = twoBoneIK(HIP_V, footR, 30, 28, -1)

  // The whip lives in the bike's local frame, so it inherits the lurch.
  const pts = lashPoints(WHIP_V, t)
  const tip = pts[pts.length - 1]

  return {
    bike: { transform: `translate(${(BIKE_V.x + jx).toFixed(1)} ${(BIKE_V.y + jy).toFixed(1)}) rotate(${jr.toFixed(2)})` },
    head: { transform: `rotate(${headRot.toFixed(2)})` },
    'upper-l': { d: segPath(SH_V, elbowL) },
    'lower-l': { d: segPath(elbowL, handL) },
    'hand-l': { transform: `translate(${handL.x.toFixed(1)} ${handL.y.toFixed(1)})` },
    'upper-r': { d: segPath(SH_V, elbowR) },
    'lower-r': { d: segPath(elbowR, handR) },
    'hand-r': { transform: `translate(${handR.x.toFixed(1)} ${handR.y.toFixed(1)})` },
    'thigh-l': { d: segPath(HIP_V, kneeL) },
    'shin-l': { d: segPath(kneeL, footL) },
    'foot-l': { transform: `translate(${footL.x.toFixed(1)} ${footL.y.toFixed(1)})` },
    'thigh-r': { d: segPath(HIP_V, kneeR) },
    'shin-r': { d: segPath(kneeR, footR) },
    'foot-r': { transform: `translate(${footR.x.toFixed(1)} ${footR.y.toFixed(1)})` },
    whip: { d: smoothPath(pts) },
    'whip-wide': { d: smoothPath(pts.slice(0, 5)) },
    'whip-tip': { transform: `translate(${tip.x.toFixed(1)} ${tip.y.toFixed(1)})` },
    star: {
      transform: `translate(434 268) scale(${(0.4 + pulse * 1.1).toFixed(2)})`,
      opacity: pulse > 0.05 ? '1' : '0',
    },
  }
}

/* ------------------------------------------------------------------ */
/* Shared stage                                                        */
/* ------------------------------------------------------------------ */

function Sun() {
  return (
    <g transform="translate(706 74)">
      <g className="whip-sun">
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i * Math.PI) / 4
          return (
            <line
              key={i}
              x1={Math.cos(angle) * 42}
              x2={Math.cos(angle) * 54}
              y1={Math.sin(angle) * 42}
              y2={Math.sin(angle) * 54}
              stroke="#F7C948"
              strokeWidth="6"
              strokeLinecap="round"
            />
          )
        })}
      </g>
      <circle r="34" fill="#F7C948" />
    </g>
  )
}

function Cloud({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity="0.92">
      <ellipse cx="0" cy="0" rx="44" ry="17" fill="#FFFFFF" />
      <ellipse cx="30" cy="-9" rx="30" ry="14" fill="#FFFFFF" />
      <ellipse cx="-28" cy="-7" rx="26" ry="12" fill="#FFFFFF" />
    </g>
  )
}

function Clouds() {
  // Two clouds spaced one tile (800px) apart; the group loops -800px so the
  // drift is seamless.
  return (
    <g className="whip-clouds">
      <Cloud x={120} y={74} />
      <Cloud x={520} y={128} scale={0.72} />
      <Cloud x={920} y={74} />
      <Cloud x={1320} y={128} scale={0.72} />
    </g>
  )
}

function Hills() {
  return (
    <g>
      <ellipse cx="150" cy="352" rx="330" ry="96" fill="#BFE3C0" />
      <ellipse cx="640" cy="360" rx="380" ry="110" fill="#A8D8AA" />
    </g>
  )
}

function Road() {
  const dashXs = [0, 160, 320, 480, 640, 800, 960]
  return (
    <g>
      <rect x="0" y="340" width="800" height="60" fill="#59616B" />
      <rect x="0" y="340" width="800" height="5" fill="#FFFFFF" opacity="0.55" />
      <g className="whip-ground">
        {dashXs.map((x) => (
          <rect key={x} x={x + 40} y={364} width="64" height="9" rx="4.5" fill="#F4F6F8" />
        ))}
      </g>
      {/* Bushes alternate two shapes (A@96, B@496, A@896, …), so their true
          pattern period is 800px — the loop must be -800px (over 5s, the same
          160px/s road speed) or the shapes switch at every wrap. */}
      <g className="whip-bushes">
        <g transform="translate(96 336)">
          <ellipse cx="0" cy="6" rx="26" ry="13" fill="#6FA97A" />
          <ellipse cx="14" cy="-2" rx="18" ry="11" fill="#7FBA89" />
        </g>
        <g transform="translate(496 338)">
          <ellipse cx="0" cy="6" rx="22" ry="11" fill="#6FA97A" />
          <ellipse cx="-12" cy="-1" rx="15" ry="9" fill="#7FBA89" />
        </g>
        <g transform="translate(896 336)">
          <ellipse cx="0" cy="6" rx="26" ry="13" fill="#6FA97A" />
          <ellipse cx="14" cy="-2" rx="18" ry="11" fill="#7FBA89" />
        </g>
        <g transform="translate(1296 338)">
          <ellipse cx="0" cy="6" rx="22" ry="11" fill="#6FA97A" />
          <ellipse cx="-12" cy="-1" rx="15" ry="9" fill="#7FBA89" />
        </g>
        <g transform="translate(1696 336)">
          <ellipse cx="0" cy="6" rx="26" ry="13" fill="#6FA97A" />
          <ellipse cx="14" cy="-2" rx="18" ry="11" fill="#7FBA89" />
        </g>
      </g>
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Shared character parts                                              */
/* ------------------------------------------------------------------ */

function Wheel({ className = 'whip-wheel' }: { className?: string }) {
  const spokes = [0, 30, 60, 90, 120, 150]
  return (
    <g className={className}>
      <circle r="34" fill="none" stroke="#262626" strokeWidth="7" />
      {spokes.map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <line
            key={deg}
            x1={-Math.cos(rad) * 28}
            x2={Math.cos(rad) * 28}
            y1={-Math.sin(rad) * 28}
            y2={Math.sin(rad) * 28}
            stroke="#8A94A6"
            strokeWidth="2"
          />
        )
      })}
      <circle r="5.5" fill="#262626" />
    </g>
  )
}

/** Bicycle drawn around its crank at local (0,0): rear wheel (-58,0), front (62,0). */
function Bike({
  fast = false,
  crankSpin = 'css',
  crankTransform,
}: {
  fast?: boolean
  crankSpin?: 'css' | 'js'
  crankTransform?: string
}) {
  const wheelCls = fast ? 'whip-wheel whip-wheel-fast' : 'whip-wheel'
  return (
    <g>
      <g transform="translate(-58 0)">
        <Wheel className={wheelCls} />
      </g>
      <g transform="translate(62 0)">
        <Wheel className={wheelCls} />
      </g>
      <g stroke="#A21942" strokeWidth="6" strokeLinecap="round" fill="none">
        <line x1="0" y1="0" x2="-58" y2="0" />
        <line x1="0" y1="0" x2="-28" y2="-58" />
        <line x1="-28" y1="-58" x2="-58" y2="0" />
        <line x1="0" y1="0" x2="36" y2="-56" />
        <line x1="-28" y1="-58" x2="36" y2="-56" />
        <line x1="36" y1="-56" x2="62" y2="0" />
        <line x1="36" y1="-56" x2="44" y2="-76" />
      </g>
      <line x1="34" y1="-76" x2="54" y2="-76" stroke="#262626" strokeWidth="5" strokeLinecap="round" />
      <rect x="-44" y="-68" width="25" height="8" rx="4" fill="#262626" />
      {/* Crank: idle CSS spin (vague) or JS-driven so the rider's legs can
          track the pedals exactly (precise) */}
      {crankSpin === 'css' ? (
        <g className={wheelCls}>
          <Crank />
        </g>
      ) : (
        <g data-part="crank" transform={crankTransform}>
          <Crank />
        </g>
      )}
      <circle r="6" fill="#262626" />
    </g>
  )
}

function Crank() {
  return (
    <>
      <line x1="0" y1="-24" x2="0" y2="24" stroke="#262626" strokeWidth="4" />
      <rect x="-9" y="-30" width="18" height="7" rx="3" fill="#262626" />
      <rect x="-9" y="23" width="18" height="7" rx="3" fill="#262626" />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Scene: precise prompt — person rides the bicycle, whip forward     */
/* ------------------------------------------------------------------ */

function PreciseScene({ a0 }: { a0: Attrs }) {
  return (
    <g>
      {/* far leg (behind the bike) */}
      <path data-part="thigh-b" d={a0['thigh-b'].d} stroke="#1F2937" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path data-part="shin-b" d={a0['shin-b'].d} stroke="#1F2937" strokeWidth="10" strokeLinecap="round" fill="none" />
      <g data-part="foot-b" transform={a0['foot-b'].transform}>
        <rect x="-5" y="-4" width="21" height="8" rx="4" fill="#2B3646" />
      </g>
      {/* far-side (left) arm — holds the bar still while the right arm whips */}
      <path data-part="arm-b" d={a0['arm-b'].d} stroke="#2B3646" strokeWidth="8" strokeLinecap="round" fill="none" />
      <g data-part="hand-b" transform={a0['hand-b'].transform}>
        <circle r="4.5" fill="#E8B48C" />
      </g>

      {/* bike with the JS-driven crank */}
      <g transform="translate(410 306)">
        <Bike crankSpin="js" crankTransform={a0.crank.transform} />
      </g>

      {/* near leg (in front of the bike) */}
      <path data-part="thigh-f" d={a0['thigh-f'].d} stroke="#262626" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path data-part="shin-f" d={a0['shin-f'].d} stroke="#262626" strokeWidth="10" strokeLinecap="round" fill="none" />
      <g data-part="foot-f" transform={a0['foot-f'].transform}>
        <rect x="-5" y="-4" width="21" height="8" rx="4" fill="#3E4A5B" />
      </g>

      {/* rider's upper body (bobs with the pedalling) */}
      <g data-part="rider" transform={a0.rider.transform}>
        <line x1="385" y1="236" x2="402" y2="196" stroke="#3E4A5B" strokeWidth="13" strokeLinecap="round" />
        <circle cx="410" cy="178" r="15" fill="#F2C6A0" />
        <ellipse cx="407" cy="167" rx="14" ry="7" fill="#262626" />
        <circle cx="417" cy="177" r="1.8" fill="#262626" />
        <path d="M 418 185 q 3 2 6 0" stroke="#262626" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      {/* right arm: two bones, telegraphing the whip on the beat */}
      <path data-part="upper-arm" d={a0['upper-arm'].d} stroke="#3E4A5B" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path data-part="lower-arm" d={a0['lower-arm'].d} stroke="#3E4A5B" strokeWidth="8" strokeLinecap="round" fill="none" />
      <g data-part="hand" transform={a0.hand.transform}>
        <rect x="-4.5" y="-7" width="9" height="14" rx="4" fill="#8B5E34" />
        <circle r="5" fill="#F2C6A0" />
      </g>

      {/* the flexible whip (grip tracks the moving hand) */}
      <path
        data-part="whip-streak"
        d="M 524 208.3 A 62 62 0 0 1 514.3 280.2"
        stroke="#7FB3E3"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        opacity={a0['whip-streak'].opacity}
      />
      <path data-part="whip" d={a0.whip.d} stroke="#4A3728" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path data-part="whip-wide" d={a0['whip-wide'].d} stroke="#4A3728" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <circle data-part="whip-tip" r="3" fill="#4A3728" transform={a0['whip-tip'].transform} />
    </g>
  )
}

/* ------------------------------------------------------------------ */
/* Scene: vague prompt — bicycle rides on top of the person           */
/* ------------------------------------------------------------------ */

function VagueScene({ a0 }: { a0: Attrs }) {
  return (
    <g>
      {/* person struggling on the ground, crouched under the bike */}
      <path data-part="thigh-l" d={a0['thigh-l'].d} stroke="#262626" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path data-part="shin-l" d={a0['shin-l'].d} stroke="#262626" strokeWidth="10" strokeLinecap="round" fill="none" />
      <g data-part="foot-l" transform={a0['foot-l'].transform}>
        <rect x="-11" y="-3" width="22" height="8" rx="4" fill="#3E4A5B" />
      </g>
      <path data-part="thigh-r" d={a0['thigh-r'].d} stroke="#1F2937" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path data-part="shin-r" d={a0['shin-r'].d} stroke="#1F2937" strokeWidth="10" strokeLinecap="round" fill="none" />
      <g data-part="foot-r" transform={a0['foot-r'].transform}>
        <rect x="-11" y="-3" width="22" height="8" rx="4" fill="#2B3646" />
      </g>
      {/* torso, squashed under the frame */}
      <line x1="428" y1="306" x2="430" y2="282" stroke="#3E4A5B" strokeWidth="13" strokeLinecap="round" />
      {/* arms flailing on either side */}
      <path data-part="upper-l" d={a0['upper-l'].d} stroke="#3E4A5B" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path data-part="lower-l" d={a0['lower-l'].d} stroke="#3E4A5B" strokeWidth="9" strokeLinecap="round" fill="none" />
      <g data-part="hand-l" transform={a0['hand-l'].transform}>
        <circle r="5" fill="#F2C6A0" />
      </g>
      <path data-part="upper-r" d={a0['upper-r'].d} stroke="#2B3646" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path data-part="lower-r" d={a0['lower-r'].d} stroke="#2B3646" strokeWidth="9" strokeLinecap="round" fill="none" />
      <g data-part="hand-r" transform={a0['hand-r'].transform}>
        <circle r="5" fill="#F2C6A0" />
      </g>
      {/* head, face up at the bike, whipping back on impact */}
      <g transform="translate(430 266)">
        <g data-part="head" transform={a0.head.transform}>
          <circle r="16" fill="#F2C6A0" />
          {/* thin hairline across the top */}
          <ellipse cx="0" cy="-11.5" rx="10.5" ry="3.5" fill="#262626" />
          {/* worried, angled brows */}
          <path d="M -10.5 -4.5 L -4.5 -7" stroke="#262626" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M 10.5 -4.5 L 4.5 -7" stroke="#262626" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* wide eyes */}
          <circle cx="-7" cy="-2" r="2.2" fill="#262626" />
          <circle cx="7" cy="-2" r="2.2" fill="#262626" />
          {/* small open "O" mouth */}
          <ellipse cx="0" cy="7.5" rx="3" ry="3.8" fill="#262626" />
        </g>
      </g>

      {/* the bicycle, riding ON TOP of the person (lurching, no rider) */}
      <g data-part="bike" transform={a0.bike.transform}>
        <Bike fast crankSpin="css" />
        <rect x="-12.5" y="-22" width="9" height="13" rx="4" fill="#8B5E34" />
        <path data-part="whip" d={a0.whip.d} stroke="#4A3728" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path data-part="whip-wide" d={a0['whip-wide'].d} stroke="#4A3728" strokeWidth="5.5" fill="none" strokeLinecap="round" />
        <circle data-part="whip-tip" r="3" fill="#4A3728" transform={a0['whip-tip'].transform} />
      </g>

      {/* impact star where the lash lands on the head */}
      <g data-part="star" transform={a0.star.transform} opacity={a0.star.opacity}>
        <g transform="scale(1.3)">
          <path d="M 0 -17 L 4.5 -4.5 L 17 0 L 4.5 4.5 L 0 17 L -4.5 4.5 L -17 0 L -4.5 -4.5 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M 12 -12 L 14 -6.5 L 19.5 -4.5 L 14 -2.5 L 12 3 L 10 -2.5 L 4.5 -4.5 L 10 -6.5 Z" fill="#FCD34D" />
          <circle cx="-12" cy="-14" r="3" fill="#FCD34D" />
        </g>
      </g>
    </g>
  )
}