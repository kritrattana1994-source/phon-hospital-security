"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Checkpoint } from "@/lib/store";
import { Printer, X, Filter, QrCode, Building, CheckCircle2 } from "lucide-react";

interface PrintQRModalProps {
  checkpoints: Checkpoint[];
  onClose: () => void;
}

export default function PrintQRModal({ checkpoints, onClose }: PrintQRModalProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");

  const buildings = Array.from(new Set(checkpoints.map((cp) => cp.building)));

  const filteredCheckpoints =
    selectedBuilding === "all"
      ? checkpoints
      : checkpoints.filter((cp) => cp.building === selectedBuilding);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex justify-center p-2 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col overflow-hidden print:shadow-none print:border-none print:w-full">
        {/* Modal Top Header (Hidden on Print) */}
        <div className="p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 flex items-center justify-center text-white shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">พิมพ์ป้าย QR Code จุดตรวจ (สำหรับติดหน้างาน)</h2>
              <p className="text-xs text-slate-400">
                ขนาดมาตรฐานสำหรับตัดเคลือบพลาสติกหรือพิมพ์ใส่สติกเกอร์ A4 ติดประจำจุดตรวจ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" /> สั่งพิมพ์หน้านี้ (Print / PDF)
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Building Filter Bar (Hidden on Print) */}
        <div className="px-6 py-3 bg-sky-50 border-b border-sky-100 flex flex-wrap items-center justify-between gap-2 print:hidden text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-600" />
            <span className="font-semibold text-slate-700">กรองตามอาคาร:</span>
            <button
              onClick={() => setSelectedBuilding("all")}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                selectedBuilding === "all"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              ทั้งหมด ({checkpoints.length} จุด)
            </button>
            {buildings.map((bldg) => (
              <button
                key={bldg}
                onClick={() => setSelectedBuilding(bldg)}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  selectedBuilding === bldg
                    ? "bg-sky-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {bldg.replace("อาคาร", "")}
              </button>
            ))}
          </div>

          <span className="text-slate-500">
            แสดง <strong>{filteredCheckpoints.length}</strong> ป้าย
          </span>
        </div>

        {/* Printable Badges Grid */}
        <div className="p-6 bg-slate-50 flex-1 overflow-y-auto print:bg-white print:p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
            {filteredCheckpoints.map((cp) => (
              <div
                key={cp.id}
                className="bg-white border-2 border-slate-300 rounded-3xl p-5 shadow-sm print:shadow-none print:border-2 print:border-slate-800 flex flex-col justify-between page-break-inside-avoid relative overflow-hidden"
              >
                {/* Hospital Header on Badge */}
                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <img
                      src="/phon_hospital_logo.png"
                      alt="โรงพยาบาลพล"
                      className="w-7 h-7 object-contain shrink-0"
                    />
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs tracking-tight">
                        โรงพยาบาลพล
                      </div>
                      <div className="text-[8px] font-bold text-slate-500 tracking-wider border-b border-red-600 uppercase">
                        PHON HOSPITAL
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-800 text-white">
                    Smart Patrol
                  </div>
                </div>

                {/* Checkpoint Title & Info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-block px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-900 font-mono font-black text-sm border border-sky-300">
                      จุดตรวจ {cp.code}
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug mt-1">
                      {cp.name}
                    </h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                      <Building className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      {cp.building} • {cp.floor}
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="p-2 bg-white rounded-2xl border-2 border-slate-200 shrink-0 flex flex-col items-center">
                    <QRCodeSVG
                      value={`HOSP-PATROL:${cp.id}:${cp.code}`}
                      size={110}
                      level="H"
                      includeMargin={false}
                    />
                    <span className="font-mono text-[9px] font-bold text-slate-500 mt-1">
                      {cp.code}
                    </span>
                  </div>
                </div>

                {/* Footer on Badge */}
                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                  <span>📍 บันทึกพิกัด GPS และเวลาจริงระดับวินาที</span>
                  <span className="text-sky-700 font-bold">แอป รปภ. รพ.พล</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
