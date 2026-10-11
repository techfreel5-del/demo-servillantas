"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import TireSvg from "../components/TireSvg";
import { useStore } from "@/lib/store";
import { formatMXN, calcIVA } from "@/lib/money";
import { Trash2, Plus, Minus, Tag, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, branchId, branchName, services, removeFromCart, updateQuantity, clearCart, cartSubtotalCents, cartServicesCents, cartTotalCents } = useStore();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [email, setEmail] = useState("cliente@demo.mx");
  const [phone, setPhone] = useState("55 1234 5678");
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [rfc, setRfc] = useState("");

  const subtotal = cartSubtotalCents();
  const servicesCost = cartServicesCents();
  const discountCents = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const totalBeforeDiscount = subtotal + servicesCost;
  const total = totalBeforeDiscount - discountCents;
  const { baseCents, ivaCents } = calcIVA(total);

  const handleCoupon = () => {
    if (coupon.toUpperCase() === "DEMO10") {
      setCouponApplied(true);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    setError(null);

    const idempotencyKey = crypto.randomUUID();

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          branchId,
          items: cart.map((i) => ({ productId: i.productId, qty: i.quantity })),
          email,
          phone,
          paymentMethod: "TARJETA",
          requiresInvoice,
          fiscalData: requiresInvoice && rfc.length >= 12 ? { rfc, nombre: rfc, regimen: "601", cp: "06600", usoCfdi: "G03" } : undefined,
          couponCode: couponApplied ? "DEMO10" : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || data.title || "Error procesando la orden");
        setProcessing(false);
        return;
      }

      clearCart();
      router.push(data.redirectUrl);
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
    }
    setProcessing(false);
  };

  return (
    <>
      <Header />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-brand mb-4">
          <ArrowLeft className="w-4 h-4" /> Seguir comprando
        </Link>
        <h1 className="text-3xl font-bold text-white mb-1">Checkout</h1>
        <p className="text-gray-400 text-sm mb-6">
          Sucursal: <span className="text-brand">{branchName}</span>
        </p>

        {cart.length === 0 ? (
          <div className="bg-dark-card border border-dark-border rounded-2xl p-16 text-center">
            <p className="text-gray-400 text-lg mb-4">Tu carrito esta vacio</p>
            <Link href="/" className="text-brand hover:text-brand-dark">Ir al catalogo</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left: Cart + Contact */}
            <div className="lg:col-span-3 space-y-4">
              {/* Cart items */}
              {cart.map((item) => (
                <div key={item.productId} className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center gap-4">
                  <TireSvg seed={1} size={56} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white text-sm">{item.brand} {item.model}</h3>
                    <p className="text-xs text-gray-500">{item.measure}</p>
                    <p className="text-sm font-bold text-white mt-1">{formatMXN(item.priceCents)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-7 h-7 bg-dark border border-dark-border rounded text-gray-400 hover:text-white flex items-center justify-center">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-white text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-7 h-7 bg-dark border border-dark-border rounded text-gray-400 hover:text-white flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-white w-24 text-right">{formatMXN(item.priceCents * item.quantity)}</span>
                  <button onClick={() => removeFromCart(item.productId)} className="text-gray-500 hover:text-error transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Contact info */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                <h3 className="font-bold text-white mb-3">Contacto</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Telefono</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Invoice toggle */}
              <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={requiresInvoice} onChange={(e) => setRequiresInvoice(e.target.checked)} className="rounded border-dark-border" />
                  <span className="text-sm text-white font-medium">Requiero factura (CFDI 4.0)</span>
                </label>
                {requiresInvoice && (
                  <div className="mt-3">
                    <label className="text-xs text-gray-400 mb-1 block">RFC</label>
                    <input value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} placeholder="XAXX010101000" className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none" />
                    {rfc.length > 0 && rfc.length < 12 && <p className="text-xs text-error mt-1">RFC debe tener 12-13 caracteres</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Summary */}
            <div className="lg:col-span-2">
              <div className="bg-dark-card border border-dark-border rounded-xl p-5 sticky top-24">
                <h3 className="font-bold text-white text-lg mb-4">Resumen</h3>
                <div className="space-y-2 mb-4 pb-4 border-b border-dark-border">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="text-gray-400 truncate mr-2">{item.brand} x{item.quantity}</span>
                      <span className="text-white">{formatMXN(item.priceCents * item.quantity)}</span>
                    </div>
                  ))}
                  {servicesCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Servicios</span>
                      <span className="text-white">{formatMXN(servicesCost)}</span>
                    </div>
                  )}
                </div>

                {/* Coupon */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Cupon de descuento" className="flex-1 bg-dark border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:border-brand focus:outline-none" />
                    <button onClick={handleCoupon} className="px-3 py-2 border border-dark-border text-gray-400 rounded-lg hover:text-brand hover:border-brand/30 text-sm transition-colors">
                      <Tag className="w-4 h-4" />
                    </button>
                  </div>
                  {couponApplied && <p className="text-xs text-success mt-1">DEMO10 aplicado (-10%)</p>}
                </div>

                <div className="space-y-1 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white">{formatMXN(subtotal + servicesCost)}</span>
                  </div>
                  {discountCents > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Descuento DEMO10</span>
                      <span>-{formatMXN(discountCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Incluye {formatMXN(ivaCents)} de IVA</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-dark-border">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-2xl font-bold text-brand">{formatMXN(total)}</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-error/10 border border-error/30 text-error text-sm p-3 rounded-lg mb-4">{error}</div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={processing}
                  className="w-full bg-brand hover:bg-brand-dark disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    "Pagar Ahora"
                  )}
                </button>

                <p className="text-[10px] text-gray-600 text-center mt-3">
                  Se genera un Idempotency Key UUID v4 al enviar. El pipeline asincrono se ejecuta automaticamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
