"use client";

import React from "react";
import type { Station } from "./StarCanvas";

export type StationModel = Station;

const ICON_TYPES: Station["iconType"][] = [
    "diamond",
    "triangle",
    "square",
    "cross",
    "satellite",
];

export default function SpaceStationsControls({
    stations,
    onAdd,
    onRemove,
    onChange,
    onPlaceRequest,
}: {
    stations: StationModel[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    onChange: (index: number, update: Partial<StationModel>) => void;
    onPlaceRequest: (index: number) => void;
}) {
    return (
        <div className="text-sm">
            <div className="flex items-center justify-between mb-2">
                <button
                    type="button"
                    onClick={onAdd}
                    className="rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-white border border-white/10"
                >
                    Add station
                </button>
            </div>

            {stations.length === 0 && (
                <div className="text-white/60 text-xs">No stations. Click "Add station" and then "Place" to position on canvas.</div>
            )}

            <div className="space-y-3">
                {stations.map((s, i) => (
                    <div key={s.id ?? i} className="rounded border border-white/10 p-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-white/80">Station #{i + 1}</div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onPlaceRequest(i)}
                                    className="text-xs rounded bg-blue-500/80 hover:bg-blue-500 text-white px-2 py-0.5"
                                >
                                    Place
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onRemove(i)}
                                    className="text-xs rounded bg-red-500/80 hover:bg-red-500 text-white px-2 py-0.5"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className="flex items-center gap-2 text-white/80">
                                <span>Name</span>
                                <input
                                    type="text"
                                    value={s.name ?? ""}
                                    onChange={(e) => onChange(i, { name: e.target.value })}
                                    placeholder={`Station ${i + 1}`}
                                    className="flex-1 rounded bg-white/10 border border-white/10 px-2 py-1 text-white"
                                />
                            </label>

                            <label className="flex items-center gap-2 text-white/80">
                                <span>Label</span>
                                <input
                                    type="checkbox"
                                    checked={s.showLabel !== false}
                                    onChange={(e) => onChange(i, { showLabel: e.target.checked })}
                                />
                            </label>

                            <label className="flex items-center gap-2 text-white/80">
                                <span>Icon</span>
                                <select
                                    value={s.iconType}
                                    onChange={(e) => onChange(i, { iconType: e.target.value as Station["iconType"] })}
                                    className="rounded bg-[#1c2536] border border-white/20 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                                >
                                    {ICON_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex items-center gap-2 text-white/80">
                                <span>Custom icon</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            const dataUrl = reader.result as string;
                                            onChange(i, { customIconDataUrl: dataUrl });
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                    className="text-white/70 text-xs"
                                />
                            </label>

                            <label className="flex items-center gap-2 text-white/80">
                                <span>Color</span>
                                <input
                                    type="color"
                                    value={s.color}
                                    onChange={(e) => onChange(i, { color: e.target.value })}
                                    className="w-10 h-6 p-0 bg-transparent border-0"
                                />
                            </label>

                            <label className="flex items-center gap-2 text-white/80">
                                <span>Size</span>
                                <input
                                    type="number"
                                    min={4}
                                    max={24}
                                    value={Math.round(s.size)}
                                    onChange={(e) => onChange(i, { size: Math.max(4, Math.min(24, Number(e.target.value))) })}
                                    className="w-20 rounded bg-white/10 border border-white/10 px-2 py-1 text-white"
                                />
                            </label>
                        </div>

                        <div className="mt-2 text-white/60 text-xs">
                            r={Math.round(s.radius)} • θ={Math.round((s.angle * 180) / Math.PI)}°
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function defaultStation(i = 0): StationModel {
    return {
        id: `${Date.now()}_${i}`,
        name: "",
        // polar coords, default slightly outside first orbit
        radius: 140 + i * 10,
        angle: 0,
        iconType: "diamond",
        color: "#FFD54F",
        size: 8,
    };
}
