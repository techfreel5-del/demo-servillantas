"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import Header from "@/app/components/Header";
import ProductCard from "@/app/components/ProductCard";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string; slug: string; brand: string; model: string; measure: string;
  priceCents: number; compareAtPriceCents: number | null; imageSvgSeed: number;
  isFeatured: boolean; description: string; available: number | null;
  loadIndex: string; speedRating: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const { branchId } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) { setProducts([]); setLoading(false); return; }
    setLoading(true);
    fetch(`/api/products?branchId=${branchId}&q=${encodeURIComponent(q)}&limit=50`)
      .then((r) => r.json())
      .then((data) => { setProducts(data.items || data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [q, branchId]);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-brand mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <Search className="w-6 h-6 text-brand" />
          Resultados para &quot;{q}&quot;
        </h1>
        <p className="text-sm text-gray-400 mb-6">{products.length} productos encontrados</p>

        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-80" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg mb-2">No se encontraron resultados</p>
            <p className="text-sm">Intenta con otro termino de busqueda</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </main>
    </>
  );
}

export default function BuscarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
