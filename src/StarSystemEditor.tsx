"use client";

import React, { useCallback, useMemo, useState } from "react";
import StarCanvas, { type Planet as CanvasPlanet, type Station as CanvasStation, type StarCanvasHandle } from "@/components/StarCanvas";
import StarSvg, { type StarSvgHandle } from "@/components/StarSvg";
import PlanetListControls, { type PlanetModel } from "@/components/PlanetListControls";
import AsteroidBeltsControls, { type BeltConfig } from "@/components/AsteroidBeltsControls";
import SpaceStationsControls, { defaultStation } from "@/components/SpaceStationsControls";
import SidebarSection from "@/components/SidebarSection";
import { mulberry32, mixSeed } from "@/lib/rng";

export default function StarSystemEditor() {
    const [numPlanets, setNumPlanets] = useState<number>(6);
    // Use a deterministic SSR seed; randomize only after client mounts to avoid hydration mismatch
    const [seed, setSeed] = useState<number>(123456789);
    // Labels
    // Show labels now per-object, keep global style settings only
    // Deprecated smart layout removed
    const [labelSize, setLabelSize] = useState<number>(12);
    const [labelColor, setLabelColor] = useState<string>("#ffffff");
    const [showLabelBackground, setShowLabelBackground] = useState<boolean>(false);
    const [labelPosition, setLabelPosition] = useState<"top-left" | "top-right" | "bottom-left" | "bottom-right">("top-left");
    const [editLabelsOpen, setEditLabelsOpen] = useState<boolean>(false);
    const [customNames, setCustomNames] = useState<Record<number, string>>({});
    // Canvas
    const [fullBleed, setFullBleed] = useState<boolean>(false);
    // Moons (now per-planet). Keep internal draw params; not exposed in general menu.
    const [showMoons] = useState<boolean>(true);
    const [moonMinSize] = useState<number>(1);
    const [moonMaxSize] = useState<number>(3);
    const [moonOrbitMin] = useState<number>(10);
    const [moonOrbitMax] = useState<number>(22);
    // Asteroid belts (per-belt config list)
    const [belts, setBelts] = useState<BeltConfig[]>([]);
    // Space stations
    const [stations, setStations] = useState<CanvasStation[]>([]);
    const [placingStationIndex, setPlacingStationIndex] = useState<number | null>(null);
    const [renderMode, setRenderMode] = useState<"canvas" | "svg">("canvas");
    // SVG dynamic dimensions (for PNG export at current size)
    const [svgWidth] = useState<number>(1200);
    const [svgHeight, setSvgHeight] = useState<number>(700);
    // UI

    // per-planet overrides (name/size/color/moons) tracked in independent array
    const [planetOverrides, setPlanetOverrides] = useState<PlanetModel[]>([]);
    // display order mapping: index -> source base index
    // Removed planet drag-reorder feature; keep original generation order only.

    // Derived: planets based on seed and count (stable prefix when count changes)
    const basePlanets: CanvasPlanet[] = useMemo(() => {
        const rand = mulberry32(seed);
        const list: CanvasPlanet[] = [];
        // Orbit spacing params
        const minOrbit = 40; // px from star
        const orbitGapMin = 35;
        const orbitGapMax = 70;
        let currentOrbit = minOrbit;
        for (let i = 0; i < numPlanets; i++) {
            const gap = orbitGapMin + rand() * (orbitGapMax - orbitGapMin);
            currentOrbit += gap;
            const size = 4 + Math.floor(rand() * 10); // 4..14 px radius
            const angle = rand() * Math.PI * 2;
            // Color palette: muted planetary hues
            const palette = [
                "#8AB4F8", // light blue
                "#F28B82", // warm red
                "#FDD663", // yellow
                "#81C995", // green
                "#CF9FFF", // purple
                "#F6AEA9", // salmon
                "#B4C7E7", // steel
                "#D7CCC8", // taupe
            ];
            const color = palette[Math.floor(rand() * palette.length)];
            // randomize moons count per planet deterministically without affecting other attrs
            const moonsGen = mulberry32(mixSeed(seed, 0xdeadbe, i));
            const moons = Math.floor(moonsGen() * 4); // 0..3 moons
            // rings: low probability, with gentle defaults
            const ringsGen = mulberry32(mixSeed(seed, 0x13579b, i));
            const hasRings = ringsGen() < 0.25; // 25% chance
            const rings = hasRings
                ? {
                    enabled: true,
                    gap: Math.floor(1 + ringsGen() * 4),
                    width: Math.floor(6 + ringsGen() * 16),
                    color: ["#c9b18b", "#a0a0a0", "#b68d5a"][Math.floor(ringsGen() * 3)],
                    opacity: 0.4 + ringsGen() * 0.3,
                    flatten: 0.5 + ringsGen() * 0.4,
                    angleDeg: Math.floor(30 + ringsGen() * 60), // 30..90 deg range
                }
                : undefined;
            list.push({ orbitRadius: currentOrbit, size, angle, color, name: "", moons, rings } as CanvasPlanet);
        }
        return list;
    }, [numPlanets, seed]);

    // Default planet names (deterministic)
    const defaultNames = useMemo(() => {
        const rand = mulberry32(seed ^ 0x51a5a5);
        const prefixes = ["Zeta", "Epsilon", "Delta", "Theta", "Omega", "Sigma", "Alpha", "Beta", "Gamma", "Kappa", "Rho", "Tau", "Xi"];
        const suffixes = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
        const syll = ["ka", "tor", "vel", "ria", "zan", "kor", "tal", "xen", "ili", "dra", "nus", "mir", "pho", "lyr", "cyg"];
        return basePlanets.map(() => {
            if (rand() < 0.5) {
                const p = prefixes[Math.floor(rand() * prefixes.length)];
                const s = suffixes[Math.floor(rand() * suffixes.length)];
                return `${p} ${s}`;
            } else {
                const parts = 2 + Math.floor(rand() * 2);
                let name = "";
                for (let j = 0; j < parts; j++) name += syll[Math.floor(rand() * syll.length)];
                return name.charAt(0).toUpperCase() + name.slice(1);
            }
        });
    }, [basePlanets, seed]);

    const getPlanetName = useCallback(
        (index: number) => {
            return customNames[index] ?? planetOverrides[index]?.name ?? defaultNames[index] ?? `Planet ${index + 1}`;
        },
        [customNames, planetOverrides, defaultNames]
    );

    // Compose final planets with overrides + names for canvas
    const planets: CanvasPlanet[] = useMemo(() => {
        return basePlanets.map((src, i) => ({
            orbitRadius: src.orbitRadius,
            angle: src.angle,
            size: planetOverrides[i]?.size ?? src.size,
            color: planetOverrides[i]?.color ?? src.color,
            name: getPlanetName(i),
            moons: planetOverrides[i]?.moons,
            rings: planetOverrides[i]?.rings ?? src.rings,
            showLabel: planetOverrides[i]?.showLabel,
        } as CanvasPlanet));
    }, [basePlanets, planetOverrides, getPlanetName]);

    // Keep overrides length in sync with planets count (in effect, not during render)
    React.useEffect(() => {
        setPlanetOverrides((prev) => {
            if (prev.length === basePlanets.length) return prev;
            const copy = [...prev];
            copy.length = basePlanets.length;
            return copy;
        });
    }, [basePlanets.length]);

    // ensure order updates on planet count or seed changes
    // No reorder tracking anymore.

    const exportPNG = useCallback(() => {
        if (renderMode === "canvas") {
            const canvas = document.getElementById("star-canvas") as HTMLCanvasElement | null;
            if (!canvas) return alert("Canvas element not found.");
            const url = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = url;
            a.download = `star-system_${seed}_${numPlanets}.png`;
            a.click();
        } else {
            const handle = svgRef.current;
            if (!handle) return alert("SVG renderer not ready.");
            (async () => {
                try {
                    const url = await handle.exportPNG(svgWidth, svgHeight);
                    if (!url) return alert("Failed to generate PNG from SVG.");
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `star-system_${seed}_${numPlanets}_${svgWidth}x${svgHeight}.png`;
                    a.click();
                } catch (e) {
                    console.error("SVG PNG export failed", e);
                    alert("SVG PNG export failed.");
                }
            })();
        }
    }, [numPlanets, seed, renderMode, svgWidth, svgHeight]);

    // upscale export
    const canvasRef = React.useRef<StarCanvasHandle | null>(null);
    const svgRef = React.useRef<StarSvgHandle | null>(null);
    const [exportSizePreset, setExportSizePreset] = useState<string>("1280x720");
    const [exporting, setExporting] = useState(false);
    const exportUpscaled = useCallback(async () => {
        if (exporting) return;
        const handle = renderMode === "svg" ? svgRef.current : canvasRef.current;
        if (!handle) return;
        const [wStr, hStr] = exportSizePreset.split("x");
        const w = Number(wStr);
        const h = Number(hStr);
        if (!w || !h) return;
        try {
            setExporting(true);
            const result = (handle as any).exportPNG(w, h);
            const url = result instanceof Promise ? await result : result;
            if (!url) return;
            const a = document.createElement("a");
            a.href = url;
            a.download = `star-system_${seed}_${numPlanets}_${w}x${h}.png`;
            a.click();
        } catch (e) {
            console.error("Upscaled export failed", e);
            alert("Failed to export upscaled PNG.");
        } finally {
            setExporting(false);
        }
    }, [exportSizePreset, seed, numPlanets, renderMode, exporting]);

    // Update svg height on mount and resize for better fit
    React.useEffect(() => {
        const update = () => setSvgHeight(Math.min(900, Math.round(window.innerHeight * 0.78)));
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // Randomize seed on client after first mount
    React.useEffect(() => {
        setSeed(Math.floor(Math.random() * 1_000_000_000));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const exportJSON = useCallback(() => {
        // Recompute deterministic moons similar to renderer for data export
        const cx = 0, cy = 0; // not needed for data, but positions are relative in this export
        const system = {
            seed,
            settings: {
                showMoons,
                moonMinSize,
                moonMaxSize,
                moonOrbitMin,
                moonOrbitMax,
                labelSize,
                labelColor,
                showLabelBackground,
                belts,
                stations: stations.map(s => ({ id: s.id, name: s.name, radius: s.radius, angle: s.angle, iconType: s.iconType, color: s.color, size: s.size, customIconDataUrl: s.customIconDataUrl, showLabel: s.showLabel !== false })),
            },
            planets: [] as Array<{
                orbitRadius: number;
                size: number;
                angle: number;
                color: string;
                name: string;
                moonsCount?: number;
                rings?: { enabled: boolean; gap: number; width: number; color: string; opacity: number; flatten: number; angleDeg: number };
                position: { x: number; y: number };
                moons: Array<{ angle: number; orbit: number; size: number; position: { x: number; y: number } }>
                showLabel?: boolean;
            }>,
        };
        planets.forEach((p, idx) => {
            const px = cx + Math.cos(p.angle) * p.orbitRadius;
            const py = cy + Math.sin(p.angle) * p.orbitRadius;
            const perPlanetCount = (typeof p.moons === 'number' ? p.moons : 0) ?? 0;
            const rgen = mulberry32(mixSeed(seed, 0xc0ffee, idx + 1));
            const moonCount = showMoons && moonMaxSize >= moonMinSize && perPlanetCount > 0 ? perPlanetCount : 0;
            const moons = Array.from({ length: moonCount }).map(() => {
                const ma = rgen() * Math.PI * 2;
                const mOrbit = moonOrbitMin + rgen() * Math.max(0, moonOrbitMax - moonOrbitMin);
                const mx = px + Math.cos(ma) * (p.size + mOrbit);
                const my = py + Math.sin(ma) * (p.size + mOrbit);
                const mSize = moonMinSize + rgen() * (moonMaxSize - moonMinSize);
                return { angle: ma, orbit: mOrbit, size: mSize, position: { x: mx, y: my } };
            });
            system.planets.push({
                orbitRadius: p.orbitRadius,
                size: p.size,
                angle: p.angle,
                color: p.color,
                name: p.name,
                moonsCount: p.moons,
                rings: p.rings,
                position: { x: px, y: py },
                moons: moons,
                showLabel: p.showLabel !== false,
            });
        });

        const blob = new Blob([JSON.stringify(system, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `star-system_${seed}_${numPlanets}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, [seed, numPlanets, planets, showMoons, moonMinSize, moonMaxSize, moonOrbitMin, moonOrbitMax, labelSize, labelColor, showLabelBackground, belts, stations]);

    const handleNumChange = (value: number) => {
        const clamped = Math.max(0, Math.min(20, Math.floor(value)));
        setNumPlanets(clamped);
    };

    const regenerate = () => setSeed(Math.floor(Math.random() * 1_000_000_000));

    // Import JSON (from an export of this tool)
    const importInputRef = React.useRef<HTMLInputElement>(null);
    const handleImportJSON = useCallback(() => {
        importInputRef.current?.click();
    }, []);
    const onImportFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(String(reader.result ?? "{}"));
                if (!data) return;
                const s = data as any;
                if (typeof s.seed === "number") setSeed(s.seed);
                if (Array.isArray(s.planets)) {
                    setNumPlanets(s.planets.length);
                    // names
                    const names: Record<number, string> = {};
                    const overrides: PlanetModel[] = new Array(s.planets.length).fill(null).map(() => ({} as PlanetModel));
                    s.planets.forEach((p: any, idx: number) => {
                        if (p?.name) names[idx] = String(p.name);
                        overrides[idx] = {
                            size: typeof p.size === "number" ? p.size : undefined,
                            color: typeof p.color === "string" ? p.color : undefined,
                            moons: typeof p.moonsCount === "number" ? p.moonsCount : undefined,
                            showLabel: p.showLabel !== false,
                            rings: p.rings ? {
                                enabled: !!p.rings.enabled,
                                gap: Number(p.rings.gap ?? 2),
                                width: Number(p.rings.width ?? 10),
                                color: String(p.rings.color ?? "#c9b18b"),
                                opacity: Number(p.rings.opacity ?? 0.55),
                                flatten: Number(p.rings.flatten ?? 0.6),
                                angleDeg: Number(p.rings.angleDeg ?? 45),
                            } : undefined,
                        } as PlanetModel;
                    });
                    setPlanetOverrides(overrides);
                    setCustomNames(names);
                }
                if (s.settings) {
                    const st = s.settings;
                    if (typeof st.labelSize === "number") setLabelSize(st.labelSize);
                    if (typeof st.labelColor === "string") setLabelColor(st.labelColor);
                    if (typeof st.showLabelBackground === "boolean") setShowLabelBackground(st.showLabelBackground);
                    if (Array.isArray(st.belts)) setBelts(st.belts);
                    if (Array.isArray(st.stations)) setStations(st.stations.map((s: any) => ({ ...s, showLabel: s.showLabel !== false })));
                }
            } catch (err) {
                console.error("Failed to import JSON", err);
                alert("Invalid JSON file.");
            } finally {
                if (importInputRef.current) importInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    }, []);

    return (
        <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-10 border-b border-white/10 bg-black/50 backdrop-blur">
                <div className="mx-auto w-full max-w-7xl px-4 md:px-6 py-3 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-white font-semibold">Star System Generator</div>
                        <div className="text-xs text-white/50">TTRPG helper</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <label className="flex items-center gap-2 text-white/80">
                            <span>Planets</span>
                            <input
                                type="range"
                                min={0}
                                max={20}
                                value={numPlanets}
                                onChange={(e) => handleNumChange(Number(e.target.value))}
                                className="w-40 accent-yellow-400"
                                aria-label="Number of planets"
                            />
                            <input
                                type="number"
                                min={0}
                                max={20}
                                value={numPlanets}
                                onChange={(e) => handleNumChange(Number(e.target.value))}
                                className="w-16 rounded bg-white/10 border border-white/10 px-2 py-1 text-white"
                            />
                        </label>

                        <div className="hidden md:block w-px h-6 bg-white/10" />

                        <label className="flex items-center gap-2 text-white/80">
                            <span>Seed</span>
                            <input
                                type="number"
                                value={seed}
                                onChange={(e) => setSeed(Number(e.target.value) || 0)}
                                className="w-32 rounded bg-white/10 border border-white/10 px-2 py-1 text-white"
                            />
                            <button
                                onClick={regenerate}
                                className="rounded bg-white/10 hover:bg-white/20 px-3 py-1.5 text-white border border-white/10"
                            >
                                Regenerate
                            </button>
                        </label>

                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-white/80">Render</span>
                                <div className="inline-flex rounded border border-white/10 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setRenderMode("canvas")}
                                        className={(renderMode === "canvas" ? "bg-white/20 " : "bg-white/10 hover:bg-white/20 ") + "text-white text-xs px-3 py-1.5"}
                                    >
                                        Canvas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRenderMode("svg")}
                                        className={(renderMode === "svg" ? "bg-white/20 " : "bg-white/10 hover:bg-white/20 ") + "text-white text-xs px-3 py-1.5 border-l border-white/10"}
                                    >
                                        SVG
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={exportPNG}
                                    className="rounded bg-yellow-400 hover:bg-yellow-300 text-black font-medium px-3 py-1.5"
                                >
                                    Export PNG
                                </button>
                                <span className="text-white/70 text-xs">Resolution</span>
                                <select
                                    value={exportSizePreset}
                                    onChange={(e) => setExportSizePreset(e.target.value)}
                                    className="rounded bg-[#1c2536] border border-white/20 px-2 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                                >
                                    <option value="1280x720">720p (1280x720)</option>
                                    <option value="1920x1080">1080p (1920x1080)</option>
                                    <option value="2048x1080">2K (2048x1080)</option>
                                    <option value="2560x1440">1440p (2560x1440)</option>
                                    <option value="3840x2160">4K (3840x2160)</option>
                                </select>
                                <button
                                    onClick={exportUpscaled}
                                    disabled={exporting}
                                    className={"rounded font-medium px-3 py-1.5 " + (exporting ? "bg-orange-300 text-white cursor-wait" : "bg-orange-500 hover:bg-orange-400 text-white")}
                                >
                                    {exporting ? "Exporting..." : "Export Upscaled"}
                                </button>
                                {renderMode === "svg" && (
                                    <button
                                        onClick={() => {
                                            const h = svgRef.current;
                                            if (!h) return;
                                            const svg = h.exportSVG();
                                            const blob = new Blob([svg], { type: "image/svg+xml" });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement("a");
                                            a.href = url;
                                            a.download = `star-system_${seed}_${numPlanets}.svg`;
                                            a.click();
                                            setTimeout(() => URL.revokeObjectURL(url), 5000);
                                        }}
                                        className="rounded bg-purple-500 hover:bg-purple-400 text-white font-medium px-3 py-1.5"
                                    >
                                        Export SVG
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={exportJSON}
                                className="rounded bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-3 py-1.5"
                            >
                                Export JSON
                            </button>
                            <button
                                onClick={handleImportJSON}
                                className="rounded bg-white/10 hover:bg-white/20 text-white font-medium px-3 py-1.5 border border-white/10"
                            >
                                Import JSON
                            </button>
                            <input
                                ref={importInputRef}
                                type="file"
                                accept="application/json"
                                className="hidden"
                                onChange={onImportFileChange}
                            />
                        </div>
                    </div>
                </div>
            </header>
            <main className="flex-1">
                <div className="w-full p-4 md:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                        {/* Left sidebar: scrollable collapsible sections */}
                        <aside className="lg:col-span-4 space-y-4 lg:pl-0">
                            <div className="sticky top-[72px] max-h-[calc(100vh-90px)] overflow-auto pr-1 flex flex-col gap-4">
                                <SidebarSection title="Labels" defaultOpen={true}>
                                    <div className="space-y-2 text-xs text-white/80">
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" checked={showLabelBackground} onChange={(e) => setShowLabelBackground(e.target.checked)} />
                                            Background box
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <span>Position</span>
                                            <select value={labelPosition} onChange={(e) => setLabelPosition(e.target.value as any)} className="rounded bg-[#1c2536] border border-white/20 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/30">
                                                <option value="top-left">Top-left</option>
                                                <option value="top-right">Top-right</option>
                                                <option value="bottom-left">Bottom-left</option>
                                                <option value="bottom-right">Bottom-right</option>
                                            </select>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <span>Size</span>
                                            <input type="range" min={8} max={24} value={labelSize} onChange={(e) => setLabelSize(Number(e.target.value))} className="w-32" />
                                            <input type="number" min={8} max={24} value={labelSize} onChange={(e) => setLabelSize(Number(e.target.value))} className="w-16 rounded bg-white/10 border border-white/10 px-2 py-1 text-white" />
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <span>Color</span>
                                            <input type="color" value={labelColor} onChange={(e) => setLabelColor(e.target.value)} className="w-10 h-6 p-0 bg-transparent border-0" />
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" checked={fullBleed} onChange={(e) => setFullBleed(e.target.checked)} />
                                            Full-bleed canvas
                                        </label>
                                    </div>
                                </SidebarSection>
                                <SidebarSection title="Planets" defaultOpen={true}>
                                    <PlanetListControls
                                        planets={planets.map((p, i) => ({
                                            orbitRadius: p.orbitRadius,
                                            size: p.size,
                                            angle: p.angle,
                                            color: p.color,
                                            moons: p.moons,
                                            rings: p.rings,
                                            name: customNames[i] ?? p.name,
                                            showLabel: p.showLabel,
                                        }))}
                                        onChange={(index, updates) => {
                                            setPlanetOverrides((prev) => {
                                                const copy = [...prev];
                                                copy[index] = { ...(copy[index] ?? {}), ...updates };
                                                return copy;
                                            });
                                            if (updates.name !== undefined) {
                                                setCustomNames((prev) => ({ ...prev, [index]: updates.name ?? "" }));
                                            }
                                        }}
                                    />
                                </SidebarSection>
                                <SidebarSection title="Space stations" defaultOpen={false} actionSlot={null}>
                                    <SpaceStationsControls
                                        stations={stations}
                                        onAdd={() => setStations(prev => [...prev, defaultStation(prev.length)])}
                                        onRemove={(idx) => setStations(prev => prev.filter((_, i) => i !== idx))}
                                        onChange={(idx, update) => setStations(prev => prev.map((s, i) => i === idx ? { ...s, ...update } : s))}
                                        onPlaceRequest={(idx) => setPlacingStationIndex(idx)}
                                    />
                                    {placingStationIndex !== null && (
                                        <div className="mt-2 text-xs text-blue-300">Click on the canvas to place station #{placingStationIndex + 1}.</div>
                                    )}
                                </SidebarSection>
                                <SidebarSection title="Asteroid belts" defaultOpen={false}>
                                    <AsteroidBeltsControls
                                        belts={belts}
                                        planetsCount={planets.length}
                                        onAdd={() => setBelts(prev => [...prev, { type: "free", width: 80, density: 0.5 }])}
                                        onRemove={(idx) => setBelts(prev => prev.filter((_, i) => i !== idx))}
                                        onChange={(idx, update) => setBelts(prev => prev.map((b, i) => i === idx ? { ...b, ...update } : b))}
                                    />
                                </SidebarSection>
                            </div>
                        </aside>

                        {/* Right: canvas */}
                        <section className="lg:col-span-8 space-y-4">
                            {/* Labels moved to left sidebar; remove old settings block */}
                            {renderMode === "canvas" ? (
                                <StarCanvas
                                    ref={canvasRef}
                                    seed={seed}
                                    planets={planets}
                                    stations={stations}
                                    showMoons={showMoons}
                                    globalMoons={0}
                                    moonMinSize={moonMinSize}
                                    moonMaxSize={moonMaxSize}
                                    moonOrbitMin={moonOrbitMin}
                                    moonOrbitMax={moonOrbitMax}
                                    labelPosition={labelPosition}
                                    labelSize={labelSize}
                                    labelColor={labelColor}
                                    showLabelBackground={showLabelBackground}
                                    belts={belts}
                                    canvasId="star-canvas"
                                    height="min(78vh, 900px)"
                                    fullBleed={fullBleed}
                                    placingStationIndex={placingStationIndex}
                                    onPlaceStation={(idx, pos) => {
                                        setStations(prev => prev.map((s, i) => i === idx ? { ...s, radius: pos.radius, angle: pos.angle } : s));
                                        setPlacingStationIndex(null);
                                    }}
                                />
                            ) : (
                                <StarSvg
                                    ref={svgRef}
                                    seed={seed}
                                    planets={planets}
                                    stations={stations}
                                    showMoons={showMoons}
                                    globalMoons={0}
                                    moonMinSize={moonMinSize}
                                    moonMaxSize={moonMaxSize}
                                    moonOrbitMin={moonOrbitMin}
                                    moonOrbitMax={moonOrbitMax}
                                    labelPosition={labelPosition}
                                    labelSize={labelSize}
                                    labelColor={labelColor}
                                    showLabelBackground={showLabelBackground}
                                    belts={belts}
                                    width={svgWidth}
                                    height={svgHeight}
                                />
                            )}
                            <p className="mt-3 text-sm text-white/60">
                                Tip: Toggle labels per planet/station. Use the seed to keep layouts stable. Export saves exactly what you see.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
