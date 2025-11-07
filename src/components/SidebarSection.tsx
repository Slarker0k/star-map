"use client";

import React from "react";

export default function SidebarSection({
    title,
    defaultOpen = true,
    actionSlot,
    children,
}: {
    title: string;
    defaultOpen?: boolean;
    actionSlot?: React.ReactNode;
    children: React.ReactNode;
}) {
    const [open, setOpen] = React.useState<boolean>(defaultOpen);
    return (
        <div className="rounded-lg border border-white/10 bg-black/40 backdrop-blur">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5"
            >
                <div className="flex items-center gap-2">
                    <span className="text-white/90 font-medium">{title}</span>
                    <span className="text-white/50 text-xs">{open ? "(hide)" : "(show)"}</span>
                </div>
                <div className="flex items-center gap-2">
                    {actionSlot}
                    <svg
                        className={"w-4 h-4 text-white/70 transition-transform " + (open ? "rotate-180" : "rotate-0")}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.086l3.71-3.855a.75.75 0 011.08 1.04l-4.24 4.4a.75.75 0 01-1.08 0l-4.24-4.4a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </button>
            {open && <div className="p-3 border-t border-white/10">{children}</div>}
        </div>
    );
}
