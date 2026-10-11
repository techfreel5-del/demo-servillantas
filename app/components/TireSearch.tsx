"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Car } from "lucide-react";

const POPULAR_SIZES = [
  { label: "205/55 R16", width: 205, series: 55, rim: 16 },
  { label: "185/65 R15", width: 185, series: 65, rim: 15 },
  { label: "225/45 R17", width: 225, series: 45, rim: 17 },
  { label: "235/55 R19", width: 235, series: 55, rim: 19 },
];

export default function TireSearch() {
  const router = useRouter();
  const [tab, setTab] = useState<"medida" | "vehiculo">("medida");

  // Medida state
  const [widths, setWidths] = useState<number[]>([]);
  const [seriesList, setSeriesList] = useState<number[]>([]);
  const [rimsList, setRimsList] = useState<number[]>([]);
  const [width, setWidth] = useState("");
  const [series, setSeries] = useState("");
  const [rim, setRim] = useState("");

  // Vehicle state
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vehicleResults, setVehicleResults] = useState<{ measure: string }[]>([]);

  // Cascading selects - medida
  useEffect(() => {
    fetch("/api/catalog/sizes")
      .then((r) => r.json())
      .then((d) => setWidths(d.widths || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!width) { setSeriesList([]); setSeries(""); return; }
    fetch(`/api/catalog/sizes?width=${width}`)
      .then((r) => r.json())
      .then((d) => { setSeriesList(d.series || []); setSeries(""); setRim(""); })
      .catch(() => {});
  }, [width]);

  useEffect(() => {
    if (!width || !series) { setRimsList([]); setRim(""); return; }
    fetch(`/api/catalog/sizes?width=${width}&series=${series}`)
      .then((r) => r.json())
      .then((d) => { setRimsList(d.rims || []); setRim(""); })
      .catch(() => {});
  }, [width, series]);

  // Cascading selects - vehicle
  useEffect(() => {
    if (tab !== "vehiculo") return;
    fetch("/api/fitments")
      .then((r) => r.json())
      .then((d) => setMakes(d.makes || []))
      .catch(() => {});
  }, [tab]);

  useEffect(() => {
    if (!make) { setModels([]); setModel(""); return; }
    fetch(`/api/fitments?make=${encodeURIComponent(make)}`)
      .then((r) => r.json())
      .then((d) => { setModels(d.models || []); setModel(""); setYear(""); })
      .catch(() => {});
  }, [make]);

  useEffect(() => {
    if (!make || !model) { setYears([]); setYear(""); return; }
    fetch(`/api/fitments?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`)
      .then((r) => r.json())
      .then((d) => { setYears(d.years || []); setYear(""); })
      .catch(() => {});
  }, [make, model]);

  useEffect(() => {
    if (!make || !model || !year) { setVehicleResults([]); return; }
    fetch(`/api/fitments?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}`)
      .then((r) => r.json())
      .then((d) => setVehicleResults(d.fitments || []))
      .catch(() => {});
  }, [make, model, year]);

  const handleSearch = () => {
    if (width && series && rim) {
      router.push(`/llantas/${width}-${series}-r${rim}`);
    }
  };

  const handleVehicleSearch = (measure: string) => {
    const m = measure.match(/(\d+)\/(\d+)\s*R(\d+)/);
    if (m) router.push(`/llantas/${m[1]}-${m[2]}-r${m[3]}`);
  };

  const handlePopular = (size: typeof POPULAR_SIZES[0]) => {
    router.push(`/llantas/${size.width}-${size.series}-r${size.rim}`);
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-dark-border">
        <button
          onClick={() => setTab("medida")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            tab === "medida" ? "bg-brand/10 text-brand border-b-2 border-brand" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Search className="w-4 h-4" /> Buscar por medida
        </button>
        <button
          onClick={() => setTab("vehiculo")}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            tab === "vehiculo" ? "bg-brand/10 text-brand border-b-2 border-brand" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Car className="w-4 h-4" /> Buscar por vehiculo
        </button>
      </div>

      <div className="p-5">
        {tab === "medida" ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block font-medium">Ancho</label>
                <select value={width} onChange={(e) => setWidth(e.target.value)}
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand focus:outline-none">
                  <option value="">Seleccionar</option>
                  {widths.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block font-medium">Serie</label>
                <select value={series} onChange={(e) => setSeries(e.target.value)} disabled={!width}
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand focus:outline-none disabled:opacity-40">
                  <option value="">Seleccionar</option>
                  {seriesList.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block font-medium">Rin</label>
                <select value={rim} onChange={(e) => setRim(e.target.value)} disabled={!series}
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand focus:outline-none disabled:opacity-40">
                  <option value="">Seleccionar</option>
                  {rimsList.map((r) => <option key={r} value={r}>R{r}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleSearch} disabled={!width || !series || !rim}
              className="w-full bg-brand hover:bg-brand-dark disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-3 rounded-lg text-sm transition-colors">
              BUSCAR MI LLANTA
            </button>
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Medidas mas populares:</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SIZES.map((s) => (
                  <button key={s.label} onClick={() => handlePopular(s)}
                    className="text-xs bg-dark border border-dark-border px-3 py-1.5 rounded-full text-gray-400 hover:text-brand hover:border-brand/30 transition-colors">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Selecciona tu vehiculo para encontrar la medida correcta:</p>
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-medium">Marca</label>
              <select value={make} onChange={(e) => setMake(e.target.value)}
                className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand focus:outline-none">
                <option value="">Seleccionar marca</option>
                {makes.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-medium">Modelo</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} disabled={!make}
                className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand focus:outline-none disabled:opacity-40">
                <option value="">Seleccionar modelo</option>
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-medium">Ano</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} disabled={!model}
                className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2.5 text-white text-sm focus:border-brand focus:outline-none disabled:opacity-40">
                <option value="">Seleccionar ano</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {vehicleResults.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-success font-medium">Medidas recomendadas:</p>
                {vehicleResults.map((f, i) => (
                  <button key={i} onClick={() => handleVehicleSearch(f.measure)}
                    className="w-full text-left bg-brand/10 border border-brand/20 text-brand px-4 py-2.5 rounded-lg hover:bg-brand/20 transition-colors text-sm font-medium">
                    {f.measure} →
                  </button>
                ))}
              </div>
            ) : (
              <button disabled={!make || !model || !year}
                className="w-full bg-brand/50 text-black/50 font-bold py-3 rounded-lg text-sm cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500">
                {make && model && year ? "Buscando..." : "BUSCAR MI LLANTA"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
