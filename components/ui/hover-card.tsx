"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";

const HoverCard = HoverCardPrimitive.Root;
const HoverCardTrigger = HoverCardPrimitive.Trigger;
const HoverCardContent = ({ className, ...props }: React.ComponentProps<typeof HoverCardPrimitive.Content>) => (
  <HoverCardPrimitive.Portal>
    <HoverCardPrimitive.Content
      sideOffset={8}
      className={cn("z-50 w-64 rounded-xl border bg-popover p-3 text-sm shadow-md", className)}
      {...props}
    />
  </HoverCardPrimitive.Portal>
);

export { HoverCard, HoverCardTrigger, HoverCardContent };
