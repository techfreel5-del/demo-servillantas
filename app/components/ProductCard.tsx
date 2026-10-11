"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { formatMXN } from "@/lib/money";
import TireSvg from "./TireSvg";
import { ShoppingCart, Check, Tag, GitCompare } from "lucide-react";

interface Product {
  id: string;
  slug: string;
  brand: string;
  model: string;
  measure: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  imageSvgSeed: number;
  isFeatured: boolean;
  description: string;
  available: number | null;
  loadIndex: string;
  speedRating: string;
}

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart, cart, toggleCompare, compareIds } = useStore();
  const inCart = cart.find((i) => i.productId === product.id);
  const inCompare = compareIds.includes(product.id);
  const outOfStock = product.available !== null && product.available <= 0;
  const discount = product.compareAtPriceCents
    ? Math.round((1 - product.priceCents / product.compareAtPriceCents) * 100)
    : 0;
  const msi6 = Math.ceil(product.priceCents / 6);

  const handleAdd = (qty: number) => {
    addToCart({
      productId: product.id,
      brand: product.brand,
      model: product.model,
      measure: product.measure,
      priceCents: product.priceCents,
      image: "",
      slug: product.slug,
    }, qty);
  };

  return (
    <div className={`bg-dark-card border rounded-xl overflow-hidden hover:border-brand/40 transition-all group relative ${
      product.isFeatured ? "border-brand/30 ring-1 ring-brand/10" : "border-dark-border"
    }`}>
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {discount > 0 && (
          <span className="bg-brand text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Tag className="w-3 h-3" /> Ahorra {discount}%
          </span>
        )}
        {product.isFeatured && (
          <span className="bg-info/20 text-info text-[10px] font-medium px-2 py-0.5 rounded-full">
            Recomendado
          </span>
        )}
      </div>

      {/* Compare button */}
      <button
        onClick={() => toggleCompare(product.id)}
        className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg transition-colors ${
          inCompare
            ? "bg-info/20 text-info"
            : "bg-dark/60 text-gray-600 opacity-0 group-hover:opacity-100 hover:text-info"
        }`}
        title={inCompare ? "Quitar de comparacion" : "Comparar"}
      >
        <GitCompare className="w-3.5 h-3.5" />
      </button>

      {/* Image */}
      <Link href={`/producto/${product.slug}`}>
        <div className="relative bg-dark p-4 flex items-center justify-center cursor-pointer">
          <TireSvg seed={product.imageSvgSeed} size={120} brand={product.brand} className="group-hover:scale-110 transition-transform duration-300" />
          {outOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="bg-error text-white text-xs font-bold px-3 py-1 rounded-full">AGOTADO</span>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="p-3">
        <div className="mb-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{product.brand}</p>
          <Link href={`/producto/${product.slug}`}>
            <h3 className="text-sm font-semibold text-white hover:text-brand transition-colors leading-tight">{product.model}</h3>
          </Link>
        </div>
        <p className="text-xs text-gray-500 mb-2">{product.measure} · {product.loadIndex}{product.speedRating}</p>

        {/* Pricing */}
        <div className="mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white">{formatMXN(product.priceCents)}</span>
            {product.compareAtPriceCents && (
              <span className="text-xs text-gray-500 line-through">{formatMXN(product.compareAtPriceCents)}</span>
            )}
          </div>
          <p className="text-[10px] text-brand">Desde {formatMXN(msi6)}/mes (6 MSI)</p>
        </div>

        {/* Stock badge */}
        {product.available !== null && (
          <div className="mb-2">
            {product.available > 5 ? (
              <span className="text-[10px] text-success font-medium">{product.available} disponibles</span>
            ) : product.available > 0 ? (
              <span className="text-[10px] text-warning font-medium">Ultimas {product.available}</span>
            ) : (
              <span className="text-[10px] text-gray-500">Disponible en otra sucursal</span>
            )}
          </div>
        )}

        {/* Quick buy buttons */}
        {!outOfStock ? (
          <div className="flex gap-1.5">
            {[1, 2, 4].map((qty) => (
              <button
                key={qty}
                onClick={() => handleAdd(qty)}
                className="flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-colors bg-dark border border-dark-border text-gray-300 hover:border-brand/50 hover:text-brand"
              >
                {inCart && inCart.quantity >= qty ? (
                  <Check className="w-3 h-3 mx-auto text-success" />
                ) : (
                  `Comprar ${qty}`
                )}
              </button>
            ))}
          </div>
        ) : (
          <button disabled className="w-full py-2 text-xs bg-gray-800 text-gray-600 rounded-lg cursor-not-allowed">
            Agotado en esta sucursal
          </button>
        )}
      </div>
    </div>
  );
}
