"use client";

import React, { useState } from "react";

interface CollapseProps {
  title: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

export default function Collapse({
  title,
  children,
  defaultOpen = false,
}: CollapseProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const panelId = `collapse-panel-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full cursor-pointer select-none items-center gap-3 border-0 bg-transparent py-3 text-left text-sm font-semibold text-slate-200 transition-all duration-200 hover:text-[var(--accent)]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span
          className={`inline-flex h-5 w-5 items-center justify-center text-xs font-bold text-[var(--accent)] transition-transform duration-300 ease-[ease] ${
            isOpen ? "rotate-90" : "rotate-0"
          }`}
          aria-hidden="true"
        >
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
        {title}
      </button>
      <div
        id={panelId}
        role="region"
        aria-label={title}
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-[ease] ${
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div
          className={`text-sm leading-[1.6] text-slate-300 ${
            isOpen ? "py-3" : "py-0"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
