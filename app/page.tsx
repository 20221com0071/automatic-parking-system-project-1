import { ParkingSimulator } from "@/components/parking-simulator"

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <header className="mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
            Automatic Parking Assist
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Self-Parking Car Simulator
          </h1>
          <p className="max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            Watch an autonomous parallel-parking maneuver unfold in real time. The car aligns with
            the open spot, reverses with the wheels toward the curb, counter-steers, and settles
            perfectly between the two parked cars.
          </p>
        </header>

        <ParkingSimulator />

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <Step
            n={1}
            title="Align"
            body="The car drives forward past the empty spot and stops alongside the front vehicle."
          />
          <Step
            n={2}
            title="Reverse in"
            body="Wheels turn toward the curb and the car reverses, swinging its rear into the spot."
          />
          <Step
            n={3}
            title="Counter-steer"
            body="Steering flips to the opposite lock, straightening the car centered in the space."
          />
        </section>
      </div>
    </main>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {n}
      </div>
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
