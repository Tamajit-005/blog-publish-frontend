"use client";

import { useEffect, useRef, useState } from "react";
import { Pipette } from "lucide-react";

export const MPK_PRESETS = [
  "#EB4F2F",
  "#F6B12D",
  "#C588BB",
  "#699EF6",
  "#858B40",
  "#B26E5E",
  "#F9E9CC",
];

export const DEFAULT_CARD_COLOR = "#EB4F2F";

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [Math.round(h), Math.round(s * 100), Math.round(max * 100)];
}

function hsvToHex(h: number, s: number, v: number): string {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

export default function CardColorPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(value));
  const [draft, setDraft] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const squareRef = useRef<HTMLDivElement>(null);

  const [h, s, v] = hsv;

  useEffect(() => {
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setHsv(hexToHsv(value));
      setDraft(value.toUpperCase());
    }
  }, [value, open]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pickHue = (e: React.PointerEvent) => {
    const el = ringRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    const next: [number, number, number] = [Math.round(deg), s, v];
    setHsv(next);
    onChange(hsvToHex(next[0], next[1], next[2]));
  };

  const pickSv = (e: React.PointerEvent) => {
    const el = squareRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ns = Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
    const nv = Math.round(Math.min(100, Math.max(0, (1 - (e.clientY - r.top) / r.height) * 100)));
    const next: [number, number, number] = [h, ns, nv];
    setHsv(next);
    onChange(hsvToHex(next[0], next[1], next[2]));
  };

  const capture = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const commitDraft = () => {
    const hex = draft.startsWith("#") ? draft : `#${draft}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) onChange(hex.toUpperCase());
    else setDraft(value.toUpperCase());
  };

  const angle = ((h - 90) * Math.PI) / 180;
  const dotX = 50 + 39 * Math.cos(angle);
  const dotY = 50 + 39 * Math.sin(angle);

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-200 transition hover:border-white/20"
      >
        <span
          className="h-6 w-6 shrink-0 rounded-full border border-black/40"
          style={{ backgroundColor: value }}
        />
        <span className="font-mono uppercase tracking-wider">{value}</span>
        <Pipette size={16} className="ml-auto text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[248px] rounded-2xl border border-white/10 bg-[#12141c] p-4 shadow-2xl">
          {/* Hue ring */}
          <div
            ref={ringRef}
            onPointerDown={(e) => { capture(e); pickHue(e); }}
            onPointerMove={(e) => { if (e.buttons) pickHue(e); }}
            className="relative mx-auto h-44 w-44 cursor-pointer touch-none rounded-full"
            style={{
              background:
                "conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
            }}
          >
            <div className="absolute inset-[22px] rounded-full bg-[#12141c]" />
            <div
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${dotX}%`, top: `${dotY}%`, backgroundColor: value }}
            />
          </div>

          {/* Saturation / brightness square */}
          <div
            ref={squareRef}
            onPointerDown={(e) => { capture(e); pickSv(e); }}
            onPointerMove={(e) => { if (e.buttons) pickSv(e); }}
            className="relative mt-4 h-28 w-full cursor-pointer touch-none overflow-hidden rounded-xl"
            style={{ backgroundColor: `hsl(${h},100%,50%)` }}
          >
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,transparent)" }}
            />
            <div
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${s}%`, top: `${100 - v}%`, backgroundColor: value }}
            />
          </div>

          {/* Hex readout */}
          <div className="mt-3 flex items-center gap-2">
            <span
              className="h-8 w-8 shrink-0 rounded-lg border border-black/40"
              style={{ backgroundColor: value }}
            />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.toUpperCase())}
              onBlur={commitDraft}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitDraft(); } }}
              spellCheck={false}
              maxLength={7}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm uppercase tracking-wider text-white outline-none focus:border-teal-500/60"
            />
          </div>

          {/* Presets */}
          <div className="mt-3 flex flex-wrap gap-2">
            {MPK_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => onChange(c)}
                className={`h-7 w-7 rounded-full border transition ${
                  value.toUpperCase() === c ? "border-white scale-110" : "border-black/40 hover:scale-110"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
