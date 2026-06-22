"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";

// Ensures the on-device database is open before rendering the app (IndexedDB
// is client-only, so we wait for hydration).
export function SeedGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    db()
      .open()
      .catch((e) => console.error("db open failed", e))
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
