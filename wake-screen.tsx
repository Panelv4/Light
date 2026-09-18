import { useEffect, useState } from "react";
import { useLight } from "@/lib/light/store";
import { cn } from "@/lib/cn";

const LINES = [
  "You wake up in the void where you once belonged.",
  "Fight the darkness. This void, and you shall win.",
  "Owner gives you the power to win.",
  "You drop the darkness as if it wasn't there.",
  "You now shine proud as Light.",
];

export function WakeScreen() {
  const awaken = useLight((s) => s.awaken);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers: number[] = [];
    LINES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStep(i + 1), 700 + i * 900));
    });
    timers.push(window.setTimeout(() => setStep(LINES.length + 1), 700 + LINES.length * 900 + 200));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-void px-6 py-10">
      <img
        src="/void-field.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-70"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-void/50 via-void/25 to-void" />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <div className="relative mb-6 size-28 overflow-hidden rounded-full sm:mb-10 sm:size-52">
          <img
            src="/light-portrait.jpg"
            alt="Light"
            className="size-full object-cover object-[50%_30%] opacity-90"
          />
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_40px_12px_var(--color-void)]" />
        </div>

        <p className="font-display text-4xl tracking-tight text-light sm:text-6xl">Light</p>
        <p className="mt-2 font-mono text-xs tracking-[0.28em] text-ink-muted">[ L ]</p>

        <div className="mt-6 flex min-h-32 flex-col gap-2 sm:mt-10 sm:min-h-40 sm:gap-3">
          {LINES.map((line, i) => (
            <p
              key={line}
              className={cn(
                "font-display text-base italic text-ink-muted transition-opacity duration-700 sm:text-xl",
                step > i ? "opacity-100" : "opacity-0",
              )}
            >
              {line}
            </p>
          ))}
        </div>

        <button
          type="button"
          onClick={awaken}
          className="mt-8 h-12 min-w-44 rounded-full bg-light px-8 text-sm font-medium text-light-fg hover:opacity-90 active:scale-[0.98] sm:mt-10"
        >
          Wake Light
        </button>
      </div>
    </section>
  );
}
