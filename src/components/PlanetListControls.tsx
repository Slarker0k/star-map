"use client";

import React from "react";
import type { Planet as CanvasPlanet } from "./StarCanvas";

export type PlanetModel = Omit<CanvasPlanet, "name"> & { name?: string };

export default function PlanetListControls({
    planets,
    onChange,
    onReorder,
}: {
    planets: PlanetModel[];
    onChange: (index: number, updates: Partial<PlanetModel>) => void;
    onReorder?: (fromIndex: number, toIndex: number) => void;
}) {
    const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.dataTransfer.setData("text/plain", String(index));
        e.dataTransfer.effectAllowed = "move";
    };

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>, toIndex: number) => {
        e.preventDefault();
        const fromIndex = Number(e.dataTransfer.getData("text/plain"));
        if (!Number.isNaN(fromIndex) && fromIndex !== toIndex) {
            onReorder?.(fromIndex, toIndex);
        }
    };

    return (
        <div className="rounded-lg border border-white/10 p-3 text-sm bg-black/40 backdrop-blur">
            <div className="text-white/90 font-medium mb-2">Planets</div>
            <div className="space-y-3">
                {planets.map((p, i) => (
                    <div
                        key={i}
                        className="space-y-2 rounded bg-white/5 hover:bg-white/10 p-2"
                        draggable
                        onDragStart={(e) => onDragStart(e, i)}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, i)}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-2 text-xs text-white/70">
                            <div className="font-medium">#{i + 1}</div>
                            <input
                                type="text"
                                value={p.name ?? ""}
                                onChange={(e) => onChange(i, { name: e.target.value })}
                                placeholder={`Planet ${i + 1}`}
                                className="md:col-span-2 rounded bg-white/10 border border-white/10 px-2 py-1 text-white"
                            />
                            <label className="flex items-center gap-1 text-white/80">
                                <input
                                    type="checkbox"
                                    checked={p.showLabel !== false}
                                    onChange={(e) => onChange(i, { showLabel: e.target.checked })}
                                />
                                <span>Label</span>
                            </label>
                            <label className="flex items-center gap-1 text-white/80">
                                <span>Size</span>
                                <input
                                    type="number"
                                    min={2}
                                    max={24}
                                    value={Math.round(p.size)}
                                    onChange={(e) => onChange(i, { size: Math.max(2, Math.min(24, Number(e.target.value))) })}
                                    className="w-16 rounded bg-white/10 border border-white/10 px-2 py-1 text-white"
                                />
                            </label>
                            <label className="flex items-center gap-1 text-white/80">
                                <span>Color</span>
                                <input
                                    type="color"
                                    value={p.color}
                                    onChange={(e) => onChange(i, { color: e.target.value })}
                                    className="w-10 h-6 p-0 bg-transparent border-0"
                                />
                            </label>
                            <label className="flex items-center gap-1 text-white/80">
                                <span>Moons</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={10}
                                    value={(p.moons ?? 0) as number}
                                    onChange={(e) => onChange(i, { moons: Math.max(0, Math.min(10, Number(e.target.value))) })}
                                    className="w-16 rounded bg-white/10 border border-white/10 px-2 py-1 text-white"
                                />
                            </label>
                        </div>
                        {/* Rings controls */}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[11px] text-white/70">
                            <label className="flex items-center gap-1 col-span-1">
                                <input
                                    type="checkbox"
                                    checked={!!p.rings?.enabled}
                                    onChange={(e) => onChange(i, { rings: { ...(p.rings ?? defaultRings()), enabled: e.target.checked } })}
                                />
                                <span>Rings</span>
                            </label>
                            {p.rings?.enabled && (
                                <>
                                    <label className="flex items-center gap-1">
                                        <span>Gap</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={Math.round(p.rings.gap)}
                                            onChange={(e) => onChange(i, { rings: { ...(p.rings!), gap: Math.max(0, Math.min(100, Number(e.target.value))) } })}
                                            className="w-14 rounded bg-white/10 border border-white/10 px-1 py-0.5 text-white"
                                        />
                                    </label>
                                    <label className="flex items-center gap-1">
                                        <span>Width</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={80}
                                            value={Math.round(p.rings.width)}
                                            onChange={(e) => onChange(i, { rings: { ...(p.rings!), width: Math.max(1, Math.min(80, Number(e.target.value))) } })}
                                            className="w-16 rounded bg-white/10 border border-white/10 px-1 py-0.5 text-white"
                                        />
                                    </label>
                                    <label className="flex items-center gap-1">
                                        <span>Flat</span>
                                        <input
                                            type="range"
                                            min={0.2}
                                            max={1}
                                            step={0.05}
                                            value={p.rings.flatten}
                                            onChange={(e) => onChange(i, { rings: { ...(p.rings!), flatten: Number(e.target.value) } })}
                                            className="w-24"
                                        />
                                    </label>
                                    <label className="flex items-center gap-1">
                                        <span>Opacity</span>
                                        <input
                                            type="range"
                                            min={0.05}
                                            max={1}
                                            step={0.05}
                                            value={p.rings.opacity}
                                            onChange={(e) => onChange(i, { rings: { ...(p.rings!), opacity: Number(e.target.value) } })}
                                            className="w-24"
                                        />
                                    </label>
                                    <label className="flex items-center gap-1 col-span-2 md:col-span-1">
                                        <span>Color</span>
                                        <input
                                            type="color"
                                            value={p.rings.color}
                                            onChange={(e) => onChange(i, { rings: { ...(p.rings!), color: e.target.value } })}
                                            className="w-10 h-5 p-0 bg-transparent border-0"
                                        />
                                    </label>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function defaultRings() {
    return { enabled: true, gap: 2, width: 10, color: "#c9b18b", opacity: 0.55, flatten: 0.6, angleDeg: 45 };
}
