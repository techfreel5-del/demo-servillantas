"use client";

import { useState, useEffect } from "react";
import Header from "../components/Header";
import { useStore } from "@/lib/store";
import { MapPin, Clock, Phone, Package, Check } from "lucide-react";

interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  hours: string;
  supportsPayAtBranch: boolean;
  totalProducts?: number;
  totalPhysical?: number;
  totalAvailable?: number;
}

export default function SucursalesPage() {
  const { branchId, setBranch } = useStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/branches?includeStock=true")
      .then((r) => r.json())
      .then((d) => { setBranches(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Nuestras Sucursales</h1>
        <p className="text-gray-400 text-sm mb-8">4 ubicaciones para servirte en todo Mexico</p>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {branches.map((b) => {
              const isSelected = b.id === branchId;
              return (
                <div
                  key={b.id}
                  className={`bg-dark-card border rounded-2xl p-6 transition-all ${
                    isSelected ? "border-brand ring-1 ring-brand/20" : "border-dark-border hover:border-brand/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {b.name}
                        {isSelected && <span className="text-xs bg-brand/20 text-brand px-2 py-0.5 rounded-full">Seleccionada</span>}
                      </h2>
                      <p className="text-xs text-gray-500 font-mono">{b.code}</p>
                    </div>
                    <MapPin className={`w-5 h-5 ${isSelected ? "text-brand" : "text-gray-600"}`} />
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-400 flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                      {b.address}, {b.city}, {b.state}
                    </p>
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      {b.hours}
                    </p>
                    {b.supportsPayAtBranch && (
                      <p className="text-sm text-success flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Pago en sucursal disponible
                      </p>
                    )}
                  </div>

                  {b.totalProducts !== undefined && (
                    <div className="flex items-center gap-4 mb-4 py-2 px-3 bg-dark/50 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-brand" />
                        <span className="text-xs text-gray-400">
                          <span className="text-white font-medium">{b.totalAvailable}</span> unidades disponibles
                        </span>
                      </div>
                      <span className="text-xs text-gray-600">|</span>
                      <span className="text-xs text-gray-500">{b.totalProducts} modelos</span>
                    </div>
                  )}

                  <button
                    onClick={() => setBranch(b.id, b.name)}
                    disabled={isSelected}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-brand/10 text-brand cursor-default"
                        : "bg-dark border border-dark-border text-gray-300 hover:border-brand/50 hover:text-brand"
                    }`}
                  >
                    {isSelected ? "Sucursal actual" : "Seleccionar sucursal"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
