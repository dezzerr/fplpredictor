"use client";

import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

export function ScrollArea({ children, className = "max-h-[70vh]" }: { children: React.ReactNode; className?: string }) {
  return (
    <ScrollAreaPrimitive.Root className={`overflow-hidden ${className}`}>
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-xl">{children}</ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar orientation="vertical" className="flex touch-none select-none p-0.5">
        <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-muted" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  );
}
