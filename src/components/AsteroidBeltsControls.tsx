"use client";

import React from "react";

export type BeltConfig = {
    type: "free" | "anchored";
    width: number;
    density: number; // 0..1
    gapIndex?: number; // valid when type == 'anchored'
};

export default function AsteroidBeltsControls({
    belts,
    planetsCount,
    onAdd,
    onRemove,
    onChange,
}: {
    belts: BeltConfig[];
    planetsCount: number;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onChange: (index: number, update: Partial<BeltConfig>) => void;
}) {
    return (
        <div className="rounded-lg border border-white/10 p-3 text-sm bg-black/40 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
                <div className="text-white/90 font-medium">Asteroid belts</div>
                <button
                    type="button"
                    onClick={onAdd}
                    className="rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-white border border-white/10"
                >
                    Add belt
                </button>
            </div>

            {belts.length === 0 && (
                <div className="text-white/60 text-xs">No belts. Click "Add belt" to create one.</div>
            )}

            <div className="space-y-3">
                {belts.map((b, i) => (
                    <div key={i} className="rounded border border-white/10 p-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-white/80">Belt #{i + 1}</div>
                            <button
                                type="button"
                                onClick={() => onRemove(i)}
                                className="text-xs rounded bg-red-500/80 hover:bg-red-500 text-white px-2 py-0.5"
                            >
                                Remove
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 text-white/80">
                                <span>Type</span>
                                <select
                                    value={b.type}
                                    onChange={(e) => onChange(i, { type: e.target.value as BeltConfig["type"] })}
                                    className="rounded bg-white/10 border border-white/10 px-2 py-1 text-white"
                                >
                                    <option value="free">Free</option>
                                    <option value="anchored">Anchored</option>
                                </select>
                            </label>

                            {b.type === "anchored" && (
                                <label className="flex items-center gap-2 text-white/80">
                                    <span>Gap</span>
                                    <select
                                        value={b.gapIndex ?? 0}
                                        onChange={(e) => onChange(i, { gapIndex: Number(e.target.value) })}
                                        className="rounded bg-white/10 border border-white/10 px-2 py-1 text-white"
                                    >
                                        {Array.from({ length: Math.max(0, planetsCount - 1) }).map((_, gi) => (
                                            <option key={gi} value={gi}>
                                                {gi} - {gi + 1}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}

                            <label className="flex items-center gap-2 text-white/80">
                                <span>Width</span>
                                <input
                                    type="number"
                                    min={10}
                                    max={200}
                                    value={Math.round(b.width)}
                                    onChange={(e) => onChange(i, { width: Math.max(10, Math.min(200, Number(e.target.value))) })}
                                    className="w-20 rounded bg-white/10 border border-white/10 px-2 py-1 text-white"
                                />
                            </label>

                            <label className="flex items-center gap-2 text-white/80">
                                <span>Density</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={b.density}
                                    onChange={(e) => onChange(i, { density: Number(e.target.value) })}
                                    className="w-32"
                                />
                                <input
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={b.density}
                                    onChange={(e) => onChange(i, { density: Number(e.target.value) })}
                                    className="w-20 rounded bg-white/10 border border-white/10 px-2 py-1 text-white"
                                />
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
