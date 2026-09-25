"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

/**
 * Self-parking simulator (simple version).
 *
 * The car is modeled with the classic "bicycle model":
 *   x, y   -> position of the car's center
 *   theta  -> heading angle (0 = pointing right)
 *   steer  -> front-wheel angle
 *
 * Each animation frame we move the car a little bit:
 *   x     += v * cos(theta) * dt
 *   y     += v * sin(theta) * dt
 *   theta += (v / wheelbase) * tan(steer) * dt
 *
 * Parallel parking is done in 3 scripted phases:
 *   1. APPROACH  - drive straight until we're next to the empty spot
 *   2. REVERSE_IN - back up with wheels turned toward the curb
 *   3. STRAIGHTEN - back up with wheels turned the other way to level out
 * When the car is level again we snap it to the exact target spot.
 */

// ---- World size (drawing units = pixels on a fixed stage) ----
const STAGE_W = 1000
const STAGE_H = 560

// ---- Car size ----
const CAR_LEN = 130
const CAR_WID = 58
const WHEELBASE = 60

// ---- Scene layout ----
const CURB_Y = 470 // where the sidewalk starts
const PARKED_LEN = 150
const PARKED_WID = 62
const PARKED_TOP = CURB_Y - PARKED_WID

const SPOT_LEFT = 400
const SPOT_RIGHT = 600
const REAR_CAR_X = SPOT_LEFT - PARKED_LEN / 2
const FRONT_CAR_X = SPOT_RIGHT + PARKED_LEN / 2

// ---- Where the car should end up ----
const TARGET_X = (SPOT_LEFT + SPOT_RIGHT) / 2
const TARGET_Y = CURB_Y - CAR_WID / 2 - 6
const LANE_Y = PARKED_TOP - CAR_WID / 2 - 8 // driving lane next to parked cars
const PULL_UP_X = 640 // where the car stops before reversing

// ---- Motion settings ----
const FORWARD_SPEED = 150 // pixels / second
const REVERSE_SPEED = 95
const STEER = (30 * Math.PI) / 180 // 30 degrees
const TURN_ANGLE = (30 * Math.PI) / 180 // how far to swing during reverse

type Phase = "idle" | "approach" | "reverseIn" | "straighten" | "done"

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Standby",
  approach: "Approaching",
  reverseIn: "Reversing in",
  straighten: "Straightening",
  done: "Parked",
}

type Car = {
  x: number
  y: number
  theta: number
  steer: number
  v: number
  phase: Phase
}

function makeCar(): Car {
  return { x: -CAR_LEN, y: LANE_Y, theta: 0, steer: 0, v: 0, phase: "idle" }
}

export function ParkingSimulator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const carRef = useRef<Car>(makeCar())
  const runningRef = useRef(false)
  const lastTsRef = useRef<number | null>(null)

  const [phase, setPhase] = useState<Phase>("idle")
  const [running, setRunning] = useState(false)

  // Advance the simulation by dt seconds.
  function update(dt: number) {
    const c = carRef.current

    if (c.phase === "approach") {
      c.v = FORWARD_SPEED
      c.steer = 0
      if (c.x >= PULL_UP_X) c.phase = "reverseIn"
    } else if (c.phase === "reverseIn") {
      c.v = -REVERSE_SPEED
      c.steer = STEER // wheels toward the curb
      if (c.theta <= -TURN_ANGLE) c.phase = "straighten"
    } else if (c.phase === "straighten") {
      c.v = -REVERSE_SPEED
      c.steer = -STEER // counter-steer to level out
      if (c.theta >= 0) {
        // Level again: snap to the exact parking spot and stop.
        carRef.current = { ...c, x: TARGET_X, y: TARGET_Y, theta: 0, steer: 0, v: 0, phase: "done" }
        return
      }
    } else {
      return // idle or done: nothing to move
    }

    // Bicycle model: move the car forward/back and turn it.
    c.x += c.v * Math.cos(c.theta) * dt
    c.y += c.v * Math.sin(c.theta) * dt
    c.theta += (c.v / WHEELBASE) * Math.tan(c.steer) * dt
  }

  // Draw the whole scene.
  function draw(ctx: CanvasRenderingContext2D) {
    const c = carRef.current

    // Road
    ctx.fillStyle = "#171c24"
    ctx.fillRect(0, 0, STAGE_W, CURB_Y)

    // Sidewalk
    ctx.fillStyle = "#232a33"
    ctx.fillRect(0, CURB_Y, STAGE_W, STAGE_H - CURB_Y)
    ctx.strokeStyle = "#3a444f"
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(0, CURB_Y)
    ctx.lineTo(STAGE_W, CURB_Y)
    ctx.stroke()

    // Empty spot outline (turns green once parked)
    ctx.strokeStyle = c.phase === "done" ? "#34d399" : "#5b6875"
    ctx.setLineDash([12, 10])
    ctx.lineWidth = 3
    ctx.strokeRect(SPOT_LEFT + 6, PARKED_TOP, SPOT_RIGHT - SPOT_LEFT - 12, PARKED_WID)
    ctx.setLineDash([])

    // Parked cars
    drawCar(ctx, REAR_CAR_X, PARKED_TOP + PARKED_WID / 2, 0, 0, "#3d4650")
    drawCar(ctx, FRONT_CAR_X, PARKED_TOP + PARKED_WID / 2, 0, 0, "#3d4650")

    // Our car
    drawCar(ctx, c.x, c.y, c.theta, c.steer, "#2563eb")
  }

  // Main animation loop.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = STAGE_W
    canvas.height = STAGE_H

    let raf = 0
    const loop = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts
      let dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts
      if (dt > 0.05) dt = 0.05 // ignore big gaps (e.g. tab switch)

      if (runningRef.current) update(dt)
      draw(ctx)

      // Sync React state so the label/buttons update.
      const p = carRef.current.phase
      setPhase((prev) => (prev === p ? prev : p))
      if (p === "done" && runningRef.current) {
        runningRef.current = false
        setRunning(false)
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ---- Buttons ----
  function start() {
    const c = carRef.current
    if (c.phase === "idle" || c.phase === "done") {
      carRef.current = { ...makeCar(), phase: "approach" }
    }
    runningRef.current = true
    setRunning(true)
  }

  function pause() {
    runningRef.current = false
    setRunning(false)
  }

  function reset() {
    runningRef.current = false
    lastTsRef.current = null
    carRef.current = makeCar()
    setRunning(false)
    setPhase("idle")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full overflow-hidden rounded-xl border border-border bg-[#0b0f14]">
        <canvas ref={canvasRef} className="block w-full" aria-label="Self-parking simulation" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {running ? (
          <Button onClick={pause} variant="secondary">
            Pause
          </Button>
        ) : (
          <Button onClick={start}>{phase === "idle" || phase === "done" ? "Start parking" : "Resume"}</Button>
        )}
        <Button onClick={reset} variant="outline" className="bg-transparent">
          Reset
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          Status: <span className="font-medium text-foreground">{PHASE_LABEL[phase]}</span>
        </span>
      </div>
    </div>
  )
}

// Draw a single car (used for both parked cars and our car).
function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theta: number,
  steer: number,
  color: string,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(theta)

  // Wheels
  ctx.fillStyle = "#0a0a0a"
  const fx = CAR_LEN * 0.3
  const rx = -CAR_LEN * 0.3
  const ty = CAR_WID * 0.42
  drawWheel(ctx, rx, -ty, 0)
  drawWheel(ctx, rx, ty, 0)
  drawWheel(ctx, fx, -ty, steer)
  drawWheel(ctx, fx, ty, steer)

  // Body
  ctx.fillStyle = color
  roundRect(ctx, -CAR_LEN / 2, -CAR_WID / 2, CAR_LEN, CAR_WID, 14)
  ctx.fill()

  // Cabin
  ctx.fillStyle = "#0f2033"
  roundRect(ctx, -CAR_LEN * 0.12, -CAR_WID / 2 + 9, CAR_LEN * 0.4, CAR_WID - 18, 8)
  ctx.fill()

  ctx.restore()
}

function drawWheel(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = "#0a0a0a"
  roundRect(ctx, -13, -6, 26, 12, 5)
  ctx.fill()
  ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
