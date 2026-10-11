"use client";

import { useState, useEffect, use } from "react";
import { useStore } from "@/lib/store";
import Header from "@/app/components/Header";
import ProductCard from "@/app/components/ProductCard";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string; slug: string; brand: string; model: string; measure: string;
  priceCents: number; compareAtPriceCents: number | null; imageSvgSeed: number;
  isFeatured: boolean; description: string; available: number | null;
  loadIndex: string; speedRating: string; usage: string;
}

interface Facets {
  brands: { value: string; count: number }[];
  usages: { value: string; count: number }[];
}

export default function LlantasPage({ params }: { params: Promise<{ medida: string }> }) {
  const { medida } = use(params);
  const { branchId, branchName } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [facets, setFacets] = useState<Facets>({ brands: [], usages: [] });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("featured");
  const [brandFilter, setBrandFilter] = useState("");
  const [total, setTotal] = useState(0);

  // Parse medida: "205-55-r16" or "buscar"
  const parts = medida.match(/^(\d+)-(\d+)-r(\d+)$/i);
  const width = parts?.[1] || "";
  const series = parts?.[2] || "";
  const rim = parts?.[3] || "";
  const measureLabel = parts ? `${width}/${series} R${rim}` : decodeURIComponent(medida);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ branchId, sort: sortBy, limit: "50" });
    if (width) p.set("width", width);
    if (series) p.set("series", series);
    if (rim) p.set("rim", rim);
    if (brandFilter) p.set("brand", brandFilter);

    // Check for search query
    if (!parts && typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const q = urlParams.get("q");
      if (q) p.set("q", q);
    }

    fetch(`/api/products?${p}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.items || data);
        setTotal(data.pagination?.total ?? (data.items || data).length);
        if (data.facets) setFacets(data.facets);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [branchId, width, series, rim, sortBy, brandFilter]);

  const minPrice = products.length ? Math.min(...products.map((p) => p.priceCents)) : 0;

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-brand mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>

        <h1 className="text-2xl font-bold text-white mb-1">
          {parts
            ? `Llantas ${measureLabel}: ${total} modelos${minPrice > 0 ? ` desde $${(minPrice / 100).toLocaleString("es-MX")}` : ""}`
            : `Resultados: ${total} modelos`}
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          Inventario de <span className="text-brand">{branchName}</span>
        </p>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar filters */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-dark-card border border-dark-border rounded-xl p-4 sticky top-20">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brand" /> Filtros
              </h3>
              <div className="mb-4">
                <label className="text-xs text-gray-400 mb-1 block">Marca</label>
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">Todas ({total})</option>
                  {facets.brands.map((b) => (
                    <option key={b.value} value={b.value}>{b.value} ({b.count})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none"
                >
                  <option value="featured">Recomendados</option>
                  <option value="price_asc">Precio: menor a mayor</option>
                  <option value="price_desc">Precio: mayor a menor</option>
                  <option value="brand">Marca A-Z</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-80" />)}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-lg mb-2">No se encontraron llantas</p>
                <p className="text-sm">Intenta con otra medida o quita los filtros</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
