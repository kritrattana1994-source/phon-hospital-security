"use client";

import { Cpu } from "lucide-react";

interface HospitalBrandProps {
  subtitle?: string;
  badgeText?: string;
  compact?: boolean;
}

export default function HospitalBrand({ subtitle, badgeText = "Smart Hospital", compact = false }: HospitalBrandProps) {
  return (
    <div className="flex items-center gap-2 select-none">
      {/* Hospital Logo Pill (as per reference image) */}
      <div className="bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2.5">
        {/* Green Cross with P logo */}
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0 relative">
          {/* Subtle cross accent */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="w-2 h-7 bg-white rounded-full absolute" />
            <div className="h-2 w-7 bg-white rounded-full absolute" />
          </div>
          <span className="relative z-10 font-bold font-sans">P</span>
        </div>

        {/* Hospital Thai and English Name */}
        <div className="leading-tight">
          <div className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-1">
            โรงพยาบาลพล
          </div>
          <div className="text-[9px] font-bold text-slate-500 tracking-wider border-b-2 border-red-600 pb-0.5 uppercase">
            PHON HOSPITAL
          </div>
        </div>
      </div>

      {/* Smart Hospital Tech Pill (as per reference image) */}
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-800 text-white text-xs font-semibold shadow-sm border border-emerald-700/80">
        <Cpu className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
        <span className="tracking-wide text-[11px]">{badgeText}</span>
      </div>
    </div>
  );
}
