"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({ value, duration = 500, format = (n:number)=>n.toString() }: { value: number; duration?: number; format?: (n:number)=>string }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(step);
      else {
        fromRef.current = to;
        startRef.current = null;
      }
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{format(Number(display.toFixed(1)))}</span>;
}
