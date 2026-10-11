"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import TireSearch from "./components/TireSearch";
import ProductCard from "./components/ProductCard";
import { useStore } from "@/lib/store";

interface Product {
  id: string; slug: string; brand: string; model: string; measure: string;
  priceCents: number; compareAtPriceCents: number | null; imageSvgSeed: number;
  isFeatured: boolean; description: string; available: number | null;
  loadIndex: string; speedRating: string;
}

export default function Home() {
  const { branchId, branchName } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?branchId=${branchId}&limit=12&sort=featured`);
      const data = await res.json();
      setProducts(data.items || data);
      setTotal(data.pagination?.total ?? (data.items || data).length);
    } catch { setProducts([]); }
    setLoading(false);
  }, [branchId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-dark-card via-dark to-dark-surface/20 border-b border-dark-border">
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="inline-block bg-brand/10 text-brand text-xs font-medium px-3 py-1 rounded-full mb-4 border border-brand/20">
                  Arquitectura Orientada a Eventos
                </span>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
                  Encuentra la llanta<br />
                  <span className="text-brand">perfecta</span> para ti
                </h1>
                <p className="text-gray-400 mb-4 max-w-md text-sm">
                  Demo PoC: E-commerce B2C con ERP simulado, CFDI 4.0, Idempotency Keys, Inventory Locks con TTL,
                  Transactional Outbox, Webhooks con HMAC y Dead Letter Queue.
                </p>
                <div className="bg-dark/50 border border-dark-border rounded-xl p-4 mb-4">
                  <p className="text-brand text-sm font-bold mb-1">Hasta 25% de descuento + 6 MSI en linea</p>
                  <p className="text-xs text-gray-500">Usa el cupon DEMO10 para 10% adicional</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {["Inventory Lock + TTL", "Idempotency Key", "Transactional Outbox", "HMAC Webhooks", "Dead Letter Queue", "CFDI 4.0 XML"].map((tag) => (
                    <span key={tag} className="flex items-center gap-1.5 text-gray-500 bg-dark/50 px-2 py-1 rounded-full border border-dark-border">
                      <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse-dot" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <TireSearch />
            </div>
          </div>
        </section>

        {/* Catalog */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Catalogo de Llantas</h2>
              <p className="text-sm text-gray-400 mt-1">
                Inventario de <span className="text-brand font-medium">{branchName}</span> · {total} modelos
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-80" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg mb-2">No se encontraron llantas</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>

        {/* Architecture flow */}
        <section className="max-w-7xl mx-auto px-4 pb-8">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Flujo Event-Driven del Pipeline</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { step: "1", title: "Checkout", desc: "Idempotency + Lock", color: "text-brand", bg: "bg-brand/20" },
                { step: "2", title: "Pasarela", desc: "Redirect simulado", color: "text-info", bg: "bg-info/20" },
                { step: "3", title: "Webhook", desc: "HMAC + Dedup", color: "text-purple-400", bg: "bg-purple-500/20" },
                { step: "4", title: "Outbox", desc: "Transactional", color: "text-cyan-400", bg: "bg-cyan-500/20" },
                { step: "5", title: "Queue", desc: "Retry + DLQ", color: "text-warning", bg: "bg-warning/20" },
                { step: "6", title: "ERP Sync", desc: "OkCar + Chaos", color: "text-orange-400", bg: "bg-orange-500/20" },
                { step: "7", title: "CFDI 4.0", desc: "XML + Timbrado", color: "text-success", bg: "bg-success/20" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-2 p-2.5 bg-dark/50 rounded-lg">
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full ${item.bg} ${item.color} flex items-center justify-center text-xs font-bold`}>
                    {item.step}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white leading-tight">{item.title}</p>
                    <p className="text-[10px] text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-dark-border py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-gray-600">
            RodaMax Llantas — PoC Demo · Next.js + Prisma + SQLite + Tailwind
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-600">
            <span>Visa</span><span>Mastercard</span><span>Amex</span><span>MercadoPago</span><span>SPEI</span>
            <span className="text-brand font-medium">6 MSI</span>
          </div>
        </div>
      </footer>
    </>
  );
}
