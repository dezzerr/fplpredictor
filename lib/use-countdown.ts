"use client";

import { useEffect, useState } from "react";

export function useCountdown(target: Date) {
  const [label, setLabel] = useState<string>("");
  useEffect(() => {
    const tick = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, target.getTime() - now);
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      setLabel(`${d}d ${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, [target]);
  return label;
}
