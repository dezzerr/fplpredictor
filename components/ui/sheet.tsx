"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetContent({ className, side = "right", ...props }: { side?: "right" | "left" | "bottom" | "top" } & React.ComponentProps<typeof DialogPrimitive.Content>) {
  const sides: Record<string, string> = {
    right: "right-0 top-0 h-full w-96 translate-x-0",
    left: "left-0 top-0 h-full w-96",
    bottom: "bottom-0 left-0 w-full translate-y-0",
    top: "top-0 left-0 w-full",
  };
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 bg-card p-4 shadow-lg outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          side === "right" && "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
          side === "left" && "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
          side === "bottom" && "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          side === "top" && "data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top",
          "rounded-l-2xl",
          sides[side],
          className
        )}
        {...props}
      >
        {props.children}
        <SheetClose className="absolute right-3 top-3 rounded-full p-1 hover:bg-muted" aria-label="Close">
          <X className="h-5 w-5" />
        </SheetClose>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetContent, SheetClose };
