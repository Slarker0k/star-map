"use client";
import React, { useMemo, forwardRef, useImperativeHandle } from "react";
import { mulberry32, mixSeed } from "@/lib/rng";
import type { Planet, Station, StarCanvasHandle } from "@/components/StarCanvas";
import type { BeltConfig } from "@/components/AsteroidBeltsControls";

export type StarSvgProps = {
    seed: number;
    planets: Planet[];
    stations?: Station[];
    showMoons: boolean;
    globalMoons: number;
    moonMinSize: number;
    moonMaxSize: number;
    moonOrbitMin: number;
    moonOrbitMax: number;
    labelSize: number;
    labelColor: string;
    showLabelBackground?: boolean;
    labelPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    belts: BeltConfig[];
    width?: number;
    height?: number;
};

export type StarSvgHandle = {
    exportSVG: () => string; // raw SVG markup
    exportPNG: (w: number, h: number) => Promise<string>; // rasterize SVG to PNG data URL
};

const StarSvg = forwardRef<StarSvgHandle, StarSvgProps>(function StarSvg({
    seed,
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
    width = 1000,
    height = 700,
}, ref) {
    const cx = width / 2;
    const cy = height / 2;

    // Precompute moon positions deterministically for SVG
    const moonData = useMemo(() => {
        const list: Array<{ x: number; y: number; size: number; parentIndex: number; orbitRadius: number }> = [];
        planets.forEach((p, idx) => {
            const count = showMoons && moonMaxSize >= moonMinSize ? ((typeof p.moons === 'number' ? p.moons : globalMoons) ?? 0) : 0;
            if (count > 0) {
                const rgen = mulberry32(mixSeed(seed, 0xc0ffee, idx + 1));
                const px = cx + Math.cos(p.angle) * p.orbitRadius;
                const py = cy + Math.sin(p.angle) * p.orbitRadius;
                for (let m = 0; m < count; m++) {
                    const ma = rgen() * Math.PI * 2;
                    const mOrbit = moonOrbitMin + rgen() * Math.max(0, moonOrbitMax - moonOrbitMin);
                    const mx = px + Math.cos(ma) * (p.size + mOrbit);
                    const my = py + Math.sin(ma) * (p.size + mOrbit);
                    const mSize = moonMinSize + rgen() * (moonMaxSize - moonMinSize);
                    list.push({ x: mx, y: my, size: mSize, parentIndex: idx, orbitRadius: p.size + mOrbit });
                }
            }
        });
        return list;
    }, [planets, showMoons, globalMoons, moonMaxSize, moonMinSize, moonOrbitMax, moonOrbitMin, seed]);

    const beltsData = useMemo(() => {
        const arr: Array<{ particles: Array<{ x: number; y: number; s: number }> }> = [];
        for (let bi = 0; bi < belts.length; bi++) {
            const belt = belts[bi];
            let inner: number, outer: number;
            if (belt.type === "anchored" && typeof belt.gapIndex === "number") {
                const a = planets[belt.gapIndex];
                const b = planets[belt.gapIndex + 1];
                if (!a || !b) { arr.push({ particles: [] }); continue; }
                const radius = (a.orbitRadius + b.orbitRadius) / 2;
                inner = Math.max(50, radius - belt.width / 2);
                outer = inner + belt.width;
            } else {
                const lastOrbit = planets.length ? planets[planets.length - 1].orbitRadius : 300;
                const minR = 80;
                const maxR = Math.max(minR + 60, lastOrbit + 120);
                const rgen2 = mulberry32(mixSeed(seed, 0xb17, bi * 293));
                const radius = minR + rgen2() * (maxR - minR);
                inner = Math.max(50, radius - belt.width / 2);
                outer = inner + belt.width;
            }
            const particlesCount = Math.floor(900 * Math.min(1, Math.max(0, belt.density)));
            const rgen = mulberry32(mixSeed(seed, 0xb17, bi * 97 + 777));
            const particles: Array<{ x: number; y: number; s: number }> = [];
            for (let i = 0; i < particlesCount; i++) {
                const ang = rgen() * Math.PI * 2;
                const rr = inner + rgen() * (outer - inner);
                const px = cx + Math.cos(ang) * rr;
                const py = cy + Math.sin(ang) * rr;
                const s = 0.5 + rgen() * 1.2;
                particles.push({ x: px, y: py, s });
            }
            arr.push({ particles });
        }
        return arr;
    }, [belts, planets, seed]);

    // Labels positions
    const labelData = useMemo(() => {
        const arr: Array<{ x: number; y: number; text: string; w: number; h: number; lineFrom: { x: number; y: number }; isLeft: boolean }> = [];
        // create a temporary canvas context for measuring text width (fallback estimation)
        const measure = (text: string) => text.length * (labelSize * 0.6);
        planets.forEach((p) => {
            if (p.showLabel === false) return;
            const px = cx + Math.cos(p.angle) * p.orbitRadius;
            const py = cy + Math.sin(p.angle) * p.orbitRadius;
            const text = p.name;
            const w = measure(text);
            const h = labelSize;
            const offset = p.size + 10;
            let lx = px, ly = py;
            switch (labelPosition) {
                case "top-left": ly = py - offset; lx = px - offset - w; break;
                case "top-right": ly = py - offset; lx = px + offset; break;
                case "bottom-left": ly = py + offset; lx = px - offset - w; break;
                case "bottom-right": ly = py + offset; lx = px + offset; break;
            }
            const isLeft = labelPosition.endsWith("left");
            arr.push({ x: lx, y: ly, text, w, h, lineFrom: { x: px, y: py }, isLeft });
        });
        stations.forEach((s) => {
            if (s.showLabel === false) return;
            const px = cx + Math.cos(s.angle) * s.radius;
            const py = cy + Math.sin(s.angle) * s.radius;
            const text = s.name ?? "Station";
            const w = measure(text);
            const h = labelSize;
            const offset = s.size + 10;
            let lx = px, ly = py;
            switch (labelPosition) {
                case "top-left": ly = py - offset; lx = px - offset - w; break;
                case "top-right": ly = py - offset; lx = px + offset; break;
                case "bottom-left": ly = py + offset; lx = px - offset - w; break;
                case "bottom-right": ly = py + offset; lx = px + offset; break;
            }
            const isLeft = labelPosition.endsWith("left");
            arr.push({ x: lx, y: ly, text, w, h, lineFrom: { x: px, y: py }, isLeft });
        });
        return arr;
    }, [planets, stations, labelPosition, labelSize, labelColor, showLabelBackground, cx, cy]);

    // Build SVG strings: full markup for export, and inner markup for JSX render
    const { full: svgElementMarkup, inner: svgInnerMarkup } = useMemo(() => {
        const starRand = mulberry32(seed ^ 0xabcdef);
        const stars: string[] = [];
        for (let i = 0; i < 300; i++) {
            const sx = starRand() * width;
            const sy = starRand() * height;
            const ss = starRand() * 1.5;
            const alpha = 0.3 + starRand() * 0.7;
            stars.push(`<rect x="${sx.toFixed(2)}" y="${sy.toFixed(2)}" width="${ss.toFixed(2)}" height="${ss.toFixed(2)}" fill="white" fill-opacity="${alpha.toFixed(2)}" />`);
        }

        // Orbits
        const orbits = planets.map(p => `<circle cx="${cx}" cy="${cy}" r="${p.orbitRadius}" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="1" fill="none" />`).join("\n");

        // Planets + rings + moons
        const planetElems: string[] = [];
        planets.forEach((p, idx) => {
            const x = cx + Math.cos(p.angle) * p.orbitRadius;
            const y = cy + Math.sin(p.angle) * p.orbitRadius;
            // ring
            if (p.rings?.enabled) {
                const gap = Math.max(0, p.rings.gap);
                const widthRing = Math.max(1, p.rings.width);
                const inner = p.size + gap;
                const mid = inner + widthRing / 2;
                const opacity = Math.min(1, Math.max(0, p.rings.opacity));
                const flatten = Math.min(1, Math.max(0.2, p.rings.flatten));
                const angle = ((p.rings.angleDeg ?? 45) * Math.PI) / 180;
                // Using ellipse rotated via transform
                planetElems.push(`<ellipse cx="${x}" cy="${y}" rx="${mid}" ry="${mid * flatten}" stroke="${p.rings.color}" stroke-width="${widthRing}" fill="none" opacity="${opacity.toFixed(2)}" transform="rotate(${(angle * 180 / Math.PI).toFixed(2)},${x},${y})" />`);
            }
            // planet body + highlight (radial gradient approximated by two circles)
            planetElems.push(`<circle cx="${x}" cy="${y}" r="${(p.size + 1.5)}" fill="#000000" fill-opacity="0.3" />`);
            planetElems.push(`<circle cx="${x}" cy="${y}" r="${p.size}" fill="${p.color}" />`);
            planetElems.push(`<circle cx="${x - p.size / 3}" cy="${y - p.size / 3}" r="${p.size / 2}" fill="#FFFFFF" fill-opacity="0.5" />`);
            // moons belonging to this planet
            moonData.filter(m => m.parentIndex === idx).forEach(m => {
                // orbit
                planetElems.push(`<circle cx="${x}" cy="${y}" r="${m.orbitRadius}" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="0.8" fill="none" />`);
                planetElems.push(`<circle cx="${m.x}" cy="${m.y}" r="${m.size}" fill="#CFCFCF" />`);
            });
        });

        // Belts particles
        const beltsMarkup = beltsData.map(b => b.particles.map(pt => `<rect x="${(pt.x).toFixed(2)}" y="${(pt.y).toFixed(2)}" width="${pt.s.toFixed(2)}" height="${pt.s.toFixed(2)}" fill="#C8C8C8" fill-opacity="0.35" />`).join("\n")).join("\n");

        // Stations
        const stationElems: string[] = [];
        stations.forEach(s => {
            const sx = cx + Math.cos(s.angle) * s.radius;
            const sy = cy + Math.sin(s.angle) * s.radius;
            const size = s.size;
            if (s.customIconDataUrl) {
                stationElems.push(`<image href="${s.customIconDataUrl}" x="${(sx - size).toFixed(2)}" y="${(sy - size).toFixed(2)}" width="${(size * 2).toFixed(2)}" height="${(size * 2).toFixed(2)}" />`);
            } else {
                switch (s.iconType) {
                    case "diamond":
                        stationElems.push(`<rect x="${(sx - size / 1.2).toFixed(2)}" y="${(sy - size / 1.2).toFixed(2)}" width="${(size / 1.2 * 2).toFixed(2)}" height="${(size / 1.2 * 2).toFixed(2)}" fill="none" stroke="${s.color}" stroke-width="1.5" transform="rotate(45,${sx.toFixed(2)},${sy.toFixed(2)})" />`);
                        break;
                    case "triangle":
                        stationElems.push(`<polygon points="${sx},${(sy - size).toFixed(2)} ${(sx + size).toFixed(2)},${(sy + size).toFixed(2)} ${(sx - size).toFixed(2)},${(sy + size).toFixed(2)}" fill="none" stroke="${s.color}" stroke-width="1.5" />`);
                        break;
                    case "square":
                        stationElems.push(`<rect x="${(sx - size).toFixed(2)}" y="${(sy - size).toFixed(2)}" width="${(size * 2).toFixed(2)}" height="${(size * 2).toFixed(2)}" fill="none" stroke="${s.color}" stroke-width="1.5" />`);
                        break;
                    case "cross":
                        stationElems.push(`<line x1="${(sx - size).toFixed(2)}" y1="${sy.toFixed(2)}" x2="${(sx + size).toFixed(2)}" y2="${sy.toFixed(2)}" stroke="${s.color}" stroke-width="1.5" />`);
                        stationElems.push(`<line x1="${sx.toFixed(2)}" y1="${(sy - size).toFixed(2)}" x2="${sx.toFixed(2)}" y2="${(sy + size).toFixed(2)}" stroke="${s.color}" stroke-width="1.5" />`);
                        break;
                    case "satellite":
                    default:
                        stationElems.push(`<circle cx="${sx.toFixed(2)}" cy="${sy.toFixed(2)}" r="${(size * 0.5).toFixed(2)}" fill="${s.color}" />`);
                        stationElems.push(`<rect x="${(sx + size * 0.7).toFixed(2)}" y="${(sy - size * 0.4).toFixed(2)}" width="${(size * 0.8).toFixed(2)}" height="${(size * 0.8).toFixed(2)}" fill="none" stroke="${s.color}" stroke-width="1.2" />`);
                        stationElems.push(`<rect x="${(sx - size * 1.5).toFixed(2)}" y="${(sy - size * 0.4).toFixed(2)}" width="${(size * 0.8).toFixed(2)}" height="${(size * 0.8).toFixed(2)}" fill="none" stroke="${s.color}" stroke-width="1.2" />`);
                        break;
                }
            }
        });

        // Labels
        const labelsMarkup = labelData.map(l => {
            const bg = showLabelBackground ? `<rect x="${(l.x - 2).toFixed(2)}" y="${(l.y - l.h / 2 - 2).toFixed(2)}" width="${(l.w + 4).toFixed(2)}" height="${(l.h + 4).toFixed(2)}" rx="4" ry="4" fill="#000000" fill-opacity="0.45" />` : "";
            const lineX = l.isLeft ? l.x + l.w : l.x;
            return `${bg}<line x1="${l.lineFrom.x.toFixed(2)}" y1="${l.lineFrom.y.toFixed(2)}" x2="${lineX.toFixed(2)}" y2="${l.y.toFixed(2)}" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="1" />` +
                `<text x="${l.x.toFixed(2)}" y="${l.y.toFixed(2)}" font-size="${labelSize}" dominant-baseline="middle" fill="${labelColor}" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto">${l.text}</text>`;
        }).join("\n");

        // Star glow using radial gradient
        const defs = `<defs><radialGradient id=\"starGlow\" cx=\"50%\" cy=\"50%\" r=\"50%\"><stop offset=\"0%\" stop-color=\"#FFEBAA\" stop-opacity=\"0.95\"/><stop offset=\"30%\" stop-color=\"#FFC850\" stop-opacity=\"0.5\"/><stop offset=\"100%\" stop-color=\"#FFC850\" stop-opacity=\"0\"/></radialGradient></defs>`;

        const inner = `${defs}\n<rect width=\"100%\" height=\"100%\" fill=\"#0b1020\"/>\n${stars.join("\n")}\n<circle cx=\"${cx}\" cy=\"${cy}\" r=\"120\" fill=\"url(#starGlow)\"/>\n<circle cx=\"${cx}\" cy=\"${cy}\" r=\"16\" fill=\"#FFE082\"/>\n${orbits}\n${planetElems.join("\n")}\n${beltsMarkup}\n${stationElems.join("\n")}\n${labelsMarkup}`;

        const full = `\n<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"${width}\" height=\"${height}\" viewBox=\"0 0 ${width} ${height}\" shape-rendering=\"geometricPrecision\" text-rendering=\"optimizeLegibility\">\n${inner}\n</svg>`;

        return { full, inner };
    }, [seed, width, height, cx, cy, planets, moonData, beltsData, stations, labelData, labelSize, labelColor, showLabelBackground]);

    useImperativeHandle(ref, () => ({
        exportSVG: () => `<?xml version=\"1.0\" encoding=\"UTF-8\"?>${svgElementMarkup}`,
        exportPNG: async (targetW: number, targetH: number) => {
            // Rebuild a scaled SVG (keep original viewBox to preserve proportions)
            const scaledSvg = svgElementMarkup
                .replace(/width=\"(.*?)\"/i, `width=\"${targetW}\"`)
                .replace(/height=\"(.*?)\"/i, `height=\"${targetH}\"`)
                .replace(/viewBox=\"0 0 ${width} ${height}\"/, `viewBox=\"0 0 ${width} ${height}\"`); // ensure viewBox remains original

            const blob = new Blob([scaledSvg], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);
            try {
                const img = new Image();
                img.crossOrigin = "anonymous"; // allow customIconDataUrl (data URLs fine; future remote safe)
                (img as any).decoding = "async";
                const loadPromise = new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = (ev) => reject(new Error("SVG image load failed"));
                });
                img.src = url;
                await loadPromise;
                if ((img as any).decode) {
                    try { await (img as any).decode(); } catch (e) { /* ignore decode failures */ }
                }
                const canvas = document.createElement("canvas");
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    console.error("StarSvg exportPNG: 2D context unavailable");
                    return "";
                }
                ctx.fillStyle = "#0b1020";
                ctx.fillRect(0, 0, targetW, targetH);
                ctx.drawImage(img, 0, 0, targetW, targetH);
                return canvas.toDataURL("image/png");
            } catch (err) {
                console.error("StarSvg exportPNG failed", err);
                return "";
            } finally {
                URL.revokeObjectURL(url);
            }
        }
    }), [svgElementMarkup, width, height]);

    return (
        <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black">
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                shapeRendering="geometricPrecision"
                textRendering="optimizeLegibility"
                dangerouslySetInnerHTML={{ __html: svgInnerMarkup }}
            />
        </div>
    );
});

export default StarSvg;
