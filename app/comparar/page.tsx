"use client";

import { useState, useEffect } from "react";
import Header from "../components/Header";
import TireSvg from "../components/TireSvg";
import { useStore } from "@/lib/store";
import { formatMXN, calcMSI } from "@/lib/money";
import Link from "next/link";
import { ArrowLeft, X, ShoppingCart, Check } from "lucide-react";

interface ProductDetail {
  product: {
    id: string;
    slug: string;
    brand: string;
    model: string;
    measure: string;
    priceCents: number;
    compareAtPriceCents: number | null;
    imageSvgSeed: number;
    usage: string;
    loadIndex: string;
    speedRating: string;
    treadwear: number;
    traction: string;
    temperature: string;
    sidewall: string;
    runFlat: boolean;
    plies: number;
    maxLoadKg: number;
    loadCapacity: string;
  };
  stock: { branchId: string; branchName: string; available: number }[];
}

export default function CompararPage() {
  const { compareIds, toggleCompare, clearCompare, addToCart, cart, branchId } = useStore();
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (compareIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(compareIds.map((id) => fetch(`/api/products/${id}`).then((r) => r.json())))
      .then((results) => { setProducts(results); setLoading(false); })
      .catch(() => setLoading(false));
  }, [compareIds]);

  const specs = [
    { label: "Medida", key: "measure" },
    { label: "Uso", key: "usage" },
    { label: "Indice de carga", key: "loadIndex" },
    { label: "Indice de velocidad", key: "speedRating" },
    { label: "Treadwear", key: "treadwear" },
    { label: "Traccion", key: "traction" },
    { label: "Temperatura", key: "temperature" },
    { label: "Pared", key: "sidewall" },
    { label: "Run Flat", key: "runFlat", format: (v: boolean) => v ? "Si" : "No" },
    { label: "Lonas", key: "plies" },
    { label: "Carga max", key: "maxLoadKg", format: (v: number) => `${v} kg` },
    { label: "Capacidad", key: "loadCapacity" },
  ] as const;

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-brand mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Volver
            </Link>
            <h1 className="text-2xl font-bold text-white">Comparar Llantas ({compareIds.length}/3)</h1>
          </div>
          {compareIds.length > 0 && (
            <button onClick={clearCompare} className="text-xs text-gray-500 hover:text-error transition-colors">
              Limpiar comparacion
            </button>
          )}
        </div>

        {compareIds.length === 0 ? (
          <div className="bg-dark-card border border-dark-border rounded-2xl p-16 text-center">
            <p className="text-gray-400 text-lg mb-2">No hay llantas para comparar</p>
            <p className="text-gray-600 text-sm mb-4">Agrega hasta 3 productos desde el catalogo</p>
            <Link href="/" className="text-brand hover:text-brand-dark">Ir al catalogo</Link>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-3 gap-4">
            {compareIds.map((id) => <div key={id} className="skeleton h-96 rounded-2xl" />)}
          </div>
        ) : (
          <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                {/* Product headers */}
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="p-4 text-left text-xs text-gray-500 font-medium w-36">Producto</th>
                    {products.map((p) => (
                      <th key={p.product.id} className="p-4 text-center min-w-[200px]">
                        <button
                          onClick={() => toggleCompare(p.product.id)}
                          className="absolute top-2 right-2 text-gray-600 hover:text-error"
                          title="Quitar de comparacion"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <Link href={`/producto/${p.product.slug}`}>
                          <TireSvg seed={p.product.imageSvgSeed} size={100} brand={p.product.brand} className="mx-auto mb-2" />
                        </Link>
                        <p className="text-xs text-gray-500 uppercase">{p.product.brand}</p>
                        <p className="text-sm font-bold text-white">{p.product.model}</p>
                        <div className="flex items-baseline justify-center gap-2 mt-1">
                          <span className="text-lg font-bold text-brand">{formatMXN(p.product.priceCents)}</span>
                          {p.product.compareAtPriceCents && (
                            <span className="text-xs text-gray-500 line-through">{formatMXN(p.product.compareAtPriceCents)}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">6 MSI de {formatMXN(calcMSI(p.product.priceCents, 6))}</p>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* Stock */}
                  <tr className="border-b border-dark-border/50">
                    <td className="p-3 text-xs text-gray-500 font-medium">Stock</td>
                    {products.map((p) => {
                      const s = p.stock.find((st) => st.branchId === branchId);
                      return (
                        <td key={p.product.id} className="p-3 text-center text-sm">
                          <span className={s && s.available > 0 ? "text-success" : "text-error"}>
                            {s ? (s.available > 0 ? `${s.available} disp.` : "Agotado") : "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Specs rows */}
                  {specs.map((spec, i) => (
                    <tr key={spec.key} className={i % 2 === 0 ? "bg-dark/30" : ""}>
                      <td className="p-3 text-xs text-gray-500 font-medium">{spec.label}</td>
                      {products.map((p) => {
                        const val = p.product[spec.key as keyof typeof p.product];
                        const formatted = "format" in spec && spec.format
                          ? (spec.format as (v: unknown) => string)(val)
                          : String(val);
                        return (
                          <td key={p.product.id} className="p-3 text-center text-sm text-white">
                            {formatted}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Add to cart row */}
                  <tr className="border-t border-dark-border">
                    <td className="p-4"></td>
                    {products.map((p) => {
                      const inCart = cart.some((c) => c.productId === p.product.id);
                      return (
                        <td key={p.product.id} className="p-4 text-center">
                          <button
                            onClick={() => addToCart({
                              productId: p.product.id,
                              brand: p.product.brand,
                              model: p.product.model,
                              measure: p.product.measure,
                              priceCents: p.product.priceCents,
                              image: "",
                              slug: p.product.slug,
                            }, 4)}
                            className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-black text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                          >
                            {inCart ? <><Check className="w-3.5 h-3.5" /> En carrito</> : <><ShoppingCart className="w-3.5 h-3.5" /> Comprar 4</>}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
