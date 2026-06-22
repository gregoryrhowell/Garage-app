"use client";

import { useEffect, useState } from "react";
import { seedIfEmpty } from "@/lib/seed";

// Runs the one-time DB seed on the client, then renders the app.
export function SeedGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedIfEmpty()
      .catch((e) => console.error("seed failed", e))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}
