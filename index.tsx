import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/light/app-shell";
import { WakeScreen } from "@/components/light/wake-screen";
import { useLight } from "@/lib/light/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [hydrated, setHydrated] = useState(false);
  const awakened = useLight((s) => s.awakened);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <WakeScreen />;
  }

  if (!awakened) return <WakeScreen />;
  return <AppShell />;
}
