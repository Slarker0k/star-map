"use client";

import React, { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { mulberry32, mixSeed } from "@/lib/rng";
import type { BeltConfig } from "./AsteroidBeltsControls";

export type Planet = {
    orbitRadius: number;
    size: number; // radius px
    angle: number; // radians
    color: string;
    name: string;
    // Optional per-planet exact moons count
    moons?: number;
    // Per-planet label visibility
    showLabel?: boolean;
    // Optional rings configuration
    rings?: {
        enabled: boolean;
        gap: number; // distance from planet surface to inner edge
        width: number; // thickness of ring (stroke width)
        color: string;
        opacity: number; // 0..1
        flatten: number; // 0.2 .. 1 scale factor on Y axis to simulate inclination
        angleDeg: number; // rotation angle in degrees
    };
};

export type Station = {
    id?: string;
    name?: string;
    radius: number; // polar coords relative to star center
    angle: number; // radians
    iconType: "diamond" | "triangle" | "square" | "cross" | "satellite";
    color: string;
    size: number; // icon size/radius in px
    customIconDataUrl?: string; // embedded image (data URL)
    showLabel?: boolean;
};

export type StarCanvasProps = {
    seed: number;
    stars?: Array<{ type: "yellow" | "red-dwarf" | "blue-giant" | "neutron" | "black-hole" }>;
    planets: Planet[];
    stations?: Station[];
    // moons
    showMoons: boolean;
    globalMoons: number; // default exact moons per planet when not set per-planet
    moonMinSize: number;
    moonMaxSize: number;
    moonOrbitMin: number;
    moonOrbitMax: number;
    // labels
    labelSize: number;
    labelColor: string;
    showLabelBackground?: boolean;
    labelPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    // belts
    belts: BeltConfig[];
    // layout
    height?: number | string; // container height (px or CSS unit)
    canvasId?: string;
    fullBleed?: boolean;
    // interactions
    placingStationIndex?: number | null;
    onPlaceStation?: (index: number, pos: { radius: number; angle: number }) => void;
};

export type StarCanvasHandle = {
    exportPNG: (width: number, height: number) => string;
};

type LabelPlacement = { x: number; y: number; text: string };

const StarCanvas = React.forwardRef<StarCanvasHandle, StarCanvasProps>(function StarCanvas({
    seed,
    stars = [{ type: "yellow" }],
    planets,
    stations = [],
    showMoons,
    globalMoons,
    moonMinSize,
    moonMaxSize,
    moonOrbitMin,
    moonOrbitMax,
    labelSize,
    labelColor,
    showLabelBackground = false,
    labelPosition = "top-left",
    belts,
    height = 600,
    canvasId,
    fullBleed = false,
    placingStationIndex = null,
    onPlaceStation,
}: StarCanvasProps, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // core renderer reused for screen and export
    const renderScene = useCallback((ctx: CanvasRenderingContext2D, width: number, h: number) => {
        // Background
        ctx.fillStyle = "#0b1020";
        ctx.fillRect(0, 0, width, h);

        const cx = width / 2;
        const cy = h / 2;

        // Stars background
        const starRand = mulberry32(seed ^ 0xabcdef);
        ctx.fillStyle = "#FFFFFF";
        for (let i = 0; i < 300; i++) {
            const sx = starRand() * width;
            const sy = starRand() * h;
            const ss = starRand() * 1.5;
            ctx.globalAlpha = 0.3 + starRand() * 0.7;
            ctx.fillRect(sx, sy, ss, ss);
        }
        ctx.globalAlpha = 1;

        // Compute star positions based on count and seed
        const count = Math.min(3, Math.max(1, stars.length));
        const baseAngle = mulberry32(seed ^ 0x5151)() * Math.PI * 2;
        const radius = 60; // distance from barycenter
        const positions: Array<{ x: number; y: number }> = [];
        if (count === 1) {
            positions.push({ x: cx, y: cy });
        } else if (count === 2) {
            positions.push({ x: cx + Math.cos(baseAngle) * radius, y: cy + Math.sin(baseAngle) * radius });
            positions.push({ x: cx - Math.cos(baseAngle) * radius, y: cy - Math.sin(baseAngle) * radius });
        } else {
            for (let i = 0; i < 3; i++) {
                const ang = baseAngle + (i * (Math.PI * 2)) / 3;
                positions.push({ x: cx + Math.cos(ang) * radius, y: cy + Math.sin(ang) * radius });
            }
        }

        // Render stars by type
        const drawStar = (type: string, x: number, y: number) => {
            switch (type) {
                case "red-dwarf": {
                    const grad = ctx.createRadialGradient(x, y, 0, x, y, 90);
                    grad.addColorStop(0, "rgba(255, 180, 120, 0.95)");
                    grad.addColorStop(0.4, "rgba(255, 100, 60, 0.5)");
                    grad.addColorStop(1, "rgba(255, 80, 40, 0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath(); ctx.arc(x, y, 90, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = "#FF9966";
                    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
                    break;
                }
                case "blue-giant": {
                    const grad = ctx.createRadialGradient(x, y, 0, x, y, 160);
                    grad.addColorStop(0, "rgba(200, 230, 255, 0.95)");
                    grad.addColorStop(0.3, "rgba(120, 190, 255, 0.5)");
                    grad.addColorStop(1, "rgba(120, 190, 255, 0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath(); ctx.arc(x, y, 160, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = "#80BFFF";
                    ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
                    break;
                }
                case "neutron": {
                    const grad = ctx.createRadialGradient(x, y, 0, x, y, 70);
                    grad.addColorStop(0, "rgba(230, 245, 255, 1)");
                    grad.addColorStop(0.4, "rgba(180, 220, 255, 0.5)");
                    grad.addColorStop(1, "rgba(180, 220, 255, 0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = "#EAF5FF";
                    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
                    // halo ring
                    ctx.strokeStyle = "rgba(220, 240, 255, 0.9)"; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke();
                    break;
                }
                case "black-hole": {
                    // accretion disk
                    ctx.strokeStyle = "rgba(255, 180, 80, 0.6)";
                    ctx.lineWidth = 12;
                    ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.stroke();
                    ctx.strokeStyle = "rgba(180, 120, 255, 0.4)";
                    ctx.lineWidth = 6;
                    ctx.beginPath(); ctx.arc(x, y, 36, 0, Math.PI * 2); ctx.stroke();
                    // event horizon
                    ctx.fillStyle = "#000000";
                    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
                    break;
                }
                case "yellow":
                default: {
                    const grad = ctx.createRadialGradient(x, y, 0, x, y, 120);
                    grad.addColorStop(0, "rgba(255, 235, 170, 0.95)");
                    grad.addColorStop(0.3, "rgba(255, 200, 80, 0.5)");
                    grad.addColorStop(1, "rgba(255, 200, 80, 0)");
                    ctx.fillStyle = grad;
                    ctx.beginPath(); ctx.arc(x, y, 120, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = "#FFE082";
                    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
                    break;
                }
            }
        };
        positions.forEach((pos, i) => drawStar(stars[i]?.type ?? "yellow", pos.x, pos.y));

        // Belts (per config)
        for (let bi = 0; bi < belts.length; bi++) {
            const belt = belts[bi];
            let inner: number, outer: number;
            if (belt.type === "anchored" && typeof belt.gapIndex === "number") {
                const a = planets[belt.gapIndex];
                const b = planets[belt.gapIndex + 1];
                if (!a || !b) continue;
                const radius = (a.orbitRadius + b.orbitRadius) / 2;
                inner = Math.max(50, radius - belt.width / 2);
                outer = inner + belt.width;
            } else {
                const lastOrbit = planets.length ? planets[planets.length - 1].orbitRadius : 300;
                const minR = 80;
                const maxR = Math.max(minR + 60, lastOrbit + 120);
                const rgen = mulberry32(mixSeed(seed, 0xb17, bi * 293));
                const radius = minR + rgen() * (maxR - minR);
                inner = Math.max(50, radius - belt.width / 2);
                outer = inner + belt.width;
            }
            const particles = Math.floor(900 * Math.min(1, Math.max(0, belt.density)));
            const rgen = mulberry32(mixSeed(seed, 0xb17, bi * 97 + 777));
            for (let i = 0; i < particles; i++) {
                const ang = rgen() * Math.PI * 2;
                const rr = inner + rgen() * (outer - inner);
                const px = cx + Math.cos(ang) * rr;
                const py = cy + Math.sin(ang) * rr;
                const s = 0.5 + rgen() * 1.2;
                ctx.fillStyle = "rgba(200,200,200,0.35)";
                ctx.fillRect(px, py, s, s);
            }
            // Belt outlines removed as requested (no inner/outer ring strokes)
        }

        // Orbits
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        for (const p of planets) {
            ctx.beginPath();
            ctx.arc(cx, cy, p.orbitRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw planets
        const moonCache: { x: number; y: number; r: number }[] = [];
        planets.forEach((p, idx) => {
            const x = cx + Math.cos(p.angle) * p.orbitRadius;
            const y = cy + Math.sin(p.angle) * p.orbitRadius;
            // rings (draw behind planet body)
            if (p.rings?.enabled) {
                const gap = Math.max(0, p.rings.gap);
                const widthRing = Math.max(1, p.rings.width);
                const inner = p.size + gap;
                const outer = inner + widthRing;
                const mid = inner + widthRing / 2;
                const opacity = Math.min(1, Math.max(0, p.rings.opacity));
                const flatten = Math.min(1, Math.max(0.2, p.rings.flatten));
                const angle = ((p.rings.angleDeg ?? 45) * Math.PI) / 180;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                ctx.scale(1, flatten);
                ctx.beginPath();
                ctx.strokeStyle = p.rings.color;
                ctx.globalAlpha = opacity;
                ctx.lineWidth = widthRing;
                ctx.arc(0, 0, mid, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.restore();
            }
            // planet body
            ctx.beginPath();
            ctx.arc(x, y, p.size + 1.5, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            const grad = ctx.createRadialGradient(x - p.size / 3, y - p.size / 3, 0, x, y, p.size);
            grad.addColorStop(0, "rgba(255,255,255,0.5)");
            grad.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // moons (exact count)
            if (showMoons && moonMaxSize >= moonMinSize) {
                const count = (typeof p.moons === 'number' ? p.moons : globalMoons) ?? 0;
                if (count > 0) {
                    const rgen = mulberry32(mixSeed(seed, 0xc0ffee, idx + 1));
                    for (let m = 0; m < count; m++) {
                        const ma = rgen() * Math.PI * 2;
                        const mOrbit = moonOrbitMin + rgen() * Math.max(0, moonOrbitMax - moonOrbitMin);
                        const mx = x + Math.cos(ma) * (p.size + mOrbit);
                        const my = y + Math.sin(ma) * (p.size + mOrbit);
                        const mSize = moonMinSize + rgen() * (moonMaxSize - moonMinSize);
                        // orbit
                        ctx.strokeStyle = "rgba(255,255,255,0.12)";
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.arc(x, y, p.size + mOrbit, 0, Math.PI * 2);
                        ctx.stroke();
                        // body
                        ctx.beginPath();
                        ctx.arc(mx, my, mSize, 0, Math.PI * 2);
                        ctx.fillStyle = "#CFCFCF";
                        ctx.fill();
                        moonCache.push({ x: mx, y: my, r: mSize });
                    }
                }
            }
        });

        // Draw stations
        for (const s of stations) {
            const sx = cx + Math.cos(s.angle) * s.radius;
            const sy = cy + Math.sin(s.angle) * s.radius;
            const size = s.size;
            ctx.save();
            ctx.translate(sx, sy);
            if (s.customIconDataUrl) {
                const img = new Image();
                img.src = s.customIconDataUrl;
                // draw immediately if cached or after load
                const drawImg = () => {
                    ctx.save();
                    ctx.translate(-size, -size);
                    ctx.drawImage(img, 0, 0, size * 2, size * 2);
                    ctx.restore();
                };
                if (img.complete) {
                    drawImg();
                } else {
                    img.onload = () => {
                        const canvas = canvasRef.current; // trigger redraw after load
                        if (canvas) requestAnimationFrame(() => draw());
                    };
                }
            } else {
                ctx.strokeStyle = s.color;
                ctx.fillStyle = s.color;
                ctx.lineWidth = 1.5;
                switch (s.iconType) {
                    case "diamond":
                        ctx.rotate(Math.PI / 4);
                        ctx.beginPath();
                        ctx.rect(-size / 1.2, -size / 1.2, (size / 1.2) * 2, (size / 1.2) * 2);
                        ctx.stroke();
                        break;
                    case "triangle":
                        ctx.beginPath();
                        ctx.moveTo(0, -size);
                        ctx.lineTo(size, size);
                        ctx.lineTo(-size, size);
                        ctx.closePath();
                        ctx.stroke();
                        break;
                    case "square":
                        ctx.beginPath();
                        ctx.rect(-size, -size, size * 2, size * 2);
                        ctx.stroke();
                        break;
                    case "cross":
                        ctx.beginPath();
                        ctx.moveTo(-size, 0);
                        ctx.lineTo(size, 0);
                        ctx.moveTo(0, -size);
                        ctx.lineTo(0, size);
                        ctx.stroke();
                        break;
                    case "satellite":
                    default:
                        // body
                        ctx.beginPath();
                        ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
                        ctx.fill();
                        // panels
                        ctx.beginPath();
                        ctx.rect(size * 0.7, -size * 0.4, size * 0.8, size * 0.8);
                        ctx.rect(-size * 1.5, -size * 0.4, size * 0.8, size * 0.8);
                        ctx.stroke();
                        break;
                }
            }
            ctx.restore();
        }

        // Labels: per-object visibility; global style still applies
        ctx.font = `${labelSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = labelColor;

        for (const p of planets) {
            if (p.showLabel === false) continue;
            const px = cx + Math.cos(p.angle) * p.orbitRadius;
            const py = cy + Math.sin(p.angle) * p.orbitRadius;
            const text = p.name;
            const w = ctx.measureText(text).width;
            const h = labelSize;
            const offset = p.size + 10; // keep label clear of the planet

            let lx = px, ly = py;
            switch (labelPosition) {
                case "top-left":
                    ly = py - offset;
                    lx = px - offset - w;
                    break;
                case "top-right":
                    ly = py - offset;
                    lx = px + offset;
                    break;
                case "bottom-left":
                    ly = py + offset;
                    lx = px - offset - w;
                    break;
                case "bottom-right":
                    ly = py + offset;
                    lx = px + offset;
                    break;
            }

            if (showLabelBackground) {
                const rx = lx - 2;
                const ry = ly - h / 2 - 2;
                const rw = w + 4;
                const rh = h + 4;
                const r = 4;
                ctx.fillStyle = "rgba(0,0,0,0.45)";
                ctx.beginPath();
                ctx.moveTo(rx + r, ry);
                ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
                ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
                ctx.arcTo(rx, ry + rh, rx, ry, r);
                ctx.arcTo(rx, ry, rx + rw, ry, r);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = labelColor;
            }

            // leader line from planet center to the label edge depending on side
            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, py);
            const isLeft = labelPosition.endsWith("left");
            ctx.lineTo(isLeft ? lx + w : lx, ly);
            ctx.stroke();

            ctx.fillText(text, lx, ly);
        }

        // station labels
        for (const s of stations) {
            if (s.showLabel === false) continue;
            const px = cx + Math.cos(s.angle) * s.radius;
            const py = cy + Math.sin(s.angle) * s.radius;
            const text = s.name ?? "Station";
            const w = ctx.measureText(text).width;
            const h2 = labelSize;
            const offset = s.size + 10;
            let lx = px, ly = py;
            switch (labelPosition) {
                case "top-left":
                    ly = py - offset;
                    lx = px - offset - w;
                    break;
                case "top-right":
                    ly = py - offset;
                    lx = px + offset;
                    break;
                case "bottom-left":
                    ly = py + offset;
                    lx = px - offset - w;
                    break;
                case "bottom-right":
                    ly = py + offset;
                    lx = px + offset;
                    break;
            }
            if (showLabelBackground) {
                const rx = lx - 2;
                const ry = ly - h2 / 2 - 2;
                const rw = w + 4;
                const rh = h2 + 4;
                const r = 4;
                ctx.fillStyle = "rgba(0,0,0,0.45)";
                ctx.beginPath();
                ctx.moveTo(rx + r, ry);
                ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
                ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
                ctx.arcTo(rx, ry + rh, rx, ry, r);
                ctx.arcTo(rx, ry, rx + rw, ry, r);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = labelColor;
            }
            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, py);
            const isLeft = labelPosition.endsWith("left");
            ctx.lineTo(isLeft ? lx + w : lx, ly);
            ctx.stroke();
            ctx.fillText(text, lx, ly);
        }

        // HUD
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
        ctx.textAlign = "left";
        ctx.fillText(`Planets: ${planets.length}  |  Seed: ${seed}`, 12, h - 12);
    }, [belts, globalMoons, labelColor, labelPosition, labelSize, moonMaxSize, moonMinSize, moonOrbitMax, moonOrbitMin, planets, seed, showMoons, stations, stars]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const rect = container.getBoundingClientRect();
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const width = Math.max(320, Math.floor(rect.width));
        const h = Math.max(320, Math.floor(rect.height));
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        renderScene(ctx, width, h);
    }, [seed, planets, stations, showMoons, globalMoons, moonMinSize, moonMaxSize, moonOrbitMin, moonOrbitMax, labelSize, labelColor, showLabelBackground, belts, labelPosition, stars]);

    useEffect(() => {
        const ro = new ResizeObserver(() => draw());
        if (containerRef.current) ro.observe(containerRef.current);
        draw();
        return () => ro.disconnect();
    }, [draw]);

    useImperativeHandle(ref, () => ({
        exportPNG: (width: number, height: number) => {
            const off = document.createElement("canvas");
            off.width = width;
            off.height = height;
            const ctx = off.getContext("2d");
            if (!ctx) return "";
            // Render at 1:1, no CSS scaling
            renderScene(ctx, width, height);
            return off.toDataURL("image/png");
        }
    }), [renderScene]);

    const containerStyle: React.CSSProperties = typeof height === 'string' ? { height } : { height: height as number };
    const containerClasses = (fullBleed ? "relative bg-black" : "relative rounded-lg overflow-hidden border border-white/10 bg-black") + (placingStationIndex !== null ? " cursor-crosshair" : "");
    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (placingStationIndex === null || placingStationIndex === undefined) return;
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;
        const cx = w / 2;
        const cy = h / 2;
        const dx = x - cx;
        const dy = y - cy;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        onPlaceStation?.(placingStationIndex, { radius, angle });
    };
    return (
        <div ref={containerRef} className={containerClasses} style={containerStyle}>
            <canvas id={canvasId} ref={canvasRef} className="block w-full h-full" onClick={handleClick} />
        </div>
    );
});

export default StarCanvas;
