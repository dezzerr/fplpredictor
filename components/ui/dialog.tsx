"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;
const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

function DialogContent({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-6 shadow-lg",
          className
        )}
        {...props}
      >
        {props.children}
        <DialogClose className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted" aria-label="Close">
          <X className="h-5 w-5" />
        </DialogClose>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", props.className)} {...props} />;
}

export { Dialog, DialogTrigger, DialogContent, DialogClose, DialogTitle, DialogDescription, DialogHeader };
