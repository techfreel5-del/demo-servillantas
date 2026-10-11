"use client";

import { useState, useEffect, use } from "react";
import { useStore } from "@/lib/store";
import { formatMXN, calcMSI } from "@/lib/money";
import Header from "@/app/components/Header";
import TireSvg from "@/app/components/TireSvg";
import ProductCard from "@/app/components/ProductCard";
import Link from "next/link";
import {
  ArrowLeft, ShoppingCart, Plus, Check, Truck, MapPin, Shield,
  Gauge, Thermometer, Ruler, Weight, Car, BarChart3, Layers,
} from "lucide-react";

interface StockEntry {
  branchId: string;
  branchCode: string;
  branchName: string;
  physical: number;
  reserved: number;
  available: number;
}

interface ServiceEntry {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  perUnit: boolean;
}

interface Vehicle {
  make: string;
  model: string;
  year: number;
  version: string;
}

interface SimilarProduct {
  id: string;
  slug: string;
  brand: string;
  model: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  imageSvgSeed: number;
  measure: string;
}

interface ProductData {
  id: string;
  sku: string;
  slug: string;
  brand: string;
  model: string;
  width: number;
  aspectRatio: number;
  rim: number;
  measure: string;
  loadIndex: string;
  speedRating: string;
  usage: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  imageSvgSeed: number;
  isFeatured: boolean;
  description: string;
  runFlat: boolean;
  treadwear: number;
  traction: string;
  temperature: string;
  sidewall: string;
  loadCapacity: string;
  plies: number;
  maxLoadKg: number;
  originalEquipment: string;
}

export default function ProductoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { addToCart, cart, branchId, addService, services: cartServices } = useStore();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [similar, setSimilar] = useState<SimilarProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(4);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        setProduct(d.product);
        setStock(d.stock || []);
        setServices(d.services || []);
        setVehicles(d.compatibleVehicles || []);
        setSimilar(d.similar || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading || !product) {
    return (
      <>
        <Header />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="skeleton h-96 rounded-2xl" />
            <div className="space-y-4">
              <div className="skeleton h-8 w-48" />
              <div className="skeleton h-6 w-32" />
              <div className="skeleton h-12 w-40" />
              <div className="skeleton h-40" />
            </div>
          </div>
        </main>
      </>
    );
  }

  const inCart = cart.find((i) => i.productId === product.id);
  const branchStock = stock.find((s) => s.branchId === branchId);
  const available = branchStock?.available ?? 0;
  const discount = product.compareAtPriceCents
    ? Math.round((1 - product.priceCents / product.compareAtPriceCents) * 100)
    : 0;

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      brand: product.brand,
      model: product.model,
      measure: product.measure,
      priceCents: product.priceCents,
      image: "",
      slug: product.slug,
    }, qty);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleAddService = (svc: ServiceEntry) => {
    addService({
      serviceId: svc.id,
      code: svc.code,
      name: svc.name,
      priceCents: svc.priceCents,
      perUnit: svc.perUnit,
      parentProductId: product.id,
    });
  };

  const specs = [
    { icon: Gauge, label: "Treadwear", value: product.treadwear },
    { icon: BarChart3, label: "Traccion", value: product.traction },
    { icon: Thermometer, label: "Temperatura", value: product.temperature },
    { icon: Ruler, label: "Pared", value: product.sidewall },
    { icon: Layers, label: "Lonas", value: product.plies },
    { icon: Weight, label: "Carga max", value: `${product.maxLoadKg} kg` },
    { icon: Shield, label: "Run Flat", value: product.runFlat ? "Si" : "No" },
    { icon: Truck, label: "Uso", value: product.usage },
  ];

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-brand mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al catalogo
        </Link>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          {/* Left: Image */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-8 flex items-center justify-center relative">
            {discount > 0 && (
              <span className="absolute top-4 left-4 bg-brand text-black text-xs font-bold px-3 py-1 rounded-full">
                -{discount}%
              </span>
            )}
            {product.isFeatured && (
              <span className="absolute top-4 right-4 bg-info/20 text-info text-xs font-medium px-3 py-1 rounded-full">
                Recomendado
              </span>
            )}
            <TireSvg seed={product.imageSvgSeed} size={280} brand={product.brand} />
          </div>

          {/* Right: Info + Actions */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{product.brand}</p>
            <h1 className="text-3xl font-bold text-white mb-1">{product.model}</h1>
            <p className="text-gray-400 text-sm mb-1">
              {product.measure} · {product.loadIndex}{product.speedRating} · SKU: {product.sku}
            </p>
            {product.originalEquipment && (
              <p className="text-xs text-info mb-2">Equipo original: {product.originalEquipment}</p>
            )}
            {product.description && (
              <p className="text-sm text-gray-400 mb-4">{product.description}</p>
            )}

            {/* Price */}
            <div className="mb-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-white">{formatMXN(product.priceCents)}</span>
                {product.compareAtPriceCents && (
                  <span className="text-lg text-gray-500 line-through">{formatMXN(product.compareAtPriceCents)}</span>
                )}
              </div>
              <p className="text-sm text-brand mt-1">
                6 MSI de {formatMXN(calcMSI(product.priceCents * qty, 6))} · Total x{qty}: {formatMXN(product.priceCents * qty)}
              </p>
            </div>

            {/* Quantity + Add to cart */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center border border-dark-border rounded-lg overflow-hidden">
                {[1, 2, 4].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQty(q)}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                      qty === q ? "bg-brand text-black" : "bg-dark text-gray-400 hover:text-white"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddToCart}
                disabled={available <= 0}
                className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-3 rounded-lg transition-colors"
              >
                {addedToCart ? (
                  <><Check className="w-5 h-5" /> Agregado</>
                ) : (
                  <><ShoppingCart className="w-5 h-5" /> Agregar {qty} al carrito</>
                )}
              </button>
            </div>

            {/* Stock per branch */}
            <div className="bg-dark/50 border border-dark-border rounded-xl p-4 mb-4">
              <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand" /> Disponibilidad por sucursal
              </h3>
              <div className="space-y-1.5">
                {stock.map((s) => (
                  <div key={s.branchId} className={`flex items-center justify-between text-sm ${s.branchId === branchId ? "text-white" : "text-gray-500"}`}>
                    <span className="flex items-center gap-1.5">
                      {s.branchId === branchId && <span className="w-1.5 h-1.5 bg-brand rounded-full" />}
                      {s.branchName}
                    </span>
                    <span className={s.available > 0 ? (s.available > 3 ? "text-success" : "text-warning") : "text-error"}>
                      {s.available > 0 ? `${s.available} disp.` : "Agotado"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Services */}
            {services.length > 0 && (
              <div className="bg-dark/50 border border-dark-border rounded-xl p-4">
                <h3 className="text-xs font-bold text-white mb-2">Servicios disponibles</h3>
                <div className="space-y-1.5">
                  {services.map((svc) => {
                    const alreadyAdded = cartServices.some((cs) => cs.serviceId === svc.id && cs.parentProductId === product.id);
                    return (
                      <div key={svc.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                          {svc.name} {svc.perUnit && <span className="text-xs text-gray-600">(por unidad)</span>}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xs">{formatMXN(svc.priceCents)}</span>
                          <button
                            onClick={() => handleAddService(svc)}
                            disabled={alreadyAdded}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              alreadyAdded
                                ? "bg-success/10 text-success cursor-default"
                                : "bg-brand/10 text-brand hover:bg-brand/20"
                            }`}
                          >
                            {alreadyAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Specs table */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Especificaciones tecnicas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {specs.map((spec) => {
              const Icon = spec.icon;
              return (
                <div key={spec.label} className="flex items-center gap-3 p-3 bg-dark/50 rounded-lg">
                  <Icon className="w-5 h-5 text-brand flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">{spec.label}</p>
                    <p className="text-sm font-medium text-white">{spec.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compatible vehicles */}
        {vehicles.length > 0 && (
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Car className="w-5 h-5 text-brand" /> Vehiculos compatibles
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {vehicles.map((v, i) => (
                <div key={i} className="bg-dark/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-white">{v.make} {v.model}</p>
                  <p className="text-xs text-gray-500">{v.year}{v.version ? ` · ${v.version}` : ""}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar products */}
        {similar.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">Llantas similares</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{
                    ...p,
                    isFeatured: false,
                    description: "",
                    available: null,
                    loadIndex: "",
                    speedRating: "",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
