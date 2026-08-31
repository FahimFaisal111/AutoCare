"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleGroupProps {
  title: string;
  count: number;
  accentClass: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/*Comment : One collapsible section - a click-to-toggle header showing the group's name and how many items are in it, with its cards underneath. Used identically by both dashboards for the Not Completed / Pending / Complete grouping, so all three groups behave the same way everywhere instead of each screen reinventing its own expand/collapse. */
export function CollapsibleGroup({ title, count, accentClass, defaultOpen = true, children }: CollapsibleGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-zinc-200">
          {title}
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${accentClass}`}>{count}</span>
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>

      {isOpen && (
        count === 0 ? (
          <p className="pl-1 text-xs text-zinc-500">Nothing in this group right now.</p>
        ) : (
          <div className="space-y-3 pl-1">{children}</div>
        )
      )}
    </div>
  );
}
