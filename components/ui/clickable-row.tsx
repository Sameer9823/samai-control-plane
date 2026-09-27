"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function ClickableRow({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(href)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      className={cn("cursor-pointer transition-colors hover:bg-panel-2/60 focus:bg-panel-2/60 focus:outline-none", className)}
    >
      {children}
    </tr>
  );
}
