"use client";

import { useStore } from "@/lib/store";
import { formatMXN } from "@/lib/money";
import TireSvg from "./TireSvg";
import Link from "next/link";
import { X, Trash2, Plus, Minus, ShoppingCart, Wrench } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const {
    cart, services, removeFromCart, updateQuantity, removeService,
    cartSubtotalCents, cartServicesCents, cartTotalCents, cartCount,
  } = useStore();

  const count = cartCount();
  const subtotal = cartSubtotalCents();
  const servicesCost = cartServicesCents();
  const total = cartTotalCents();

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 transition-opacity" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-dark-card border-l border-dark-border z-50 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-brand" />
            Carrito ({count})
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-dark-border/50 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ maxHeight: "calc(100vh - 220px)" }}>
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">Tu carrito esta vacio</p>
              <button onClick={onClose} className="text-brand text-sm mt-2 hover:text-brand-dark">
                Seguir comprando
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const itemServices = services.filter((s) => s.parentProductId === item.productId);
              return (
                <div key={item.productId} className="bg-dark/50 border border-dark-border rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <TireSvg seed={1} size={48} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.brand} {item.model}</p>
                      <p className="text-xs text-gray-500">{item.measure}</p>
                      <p className="text-xs text-brand font-medium">{formatMXN(item.priceCents)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-6 h-6 bg-dark border border-dark-border rounded text-gray-400 hover:text-white flex items-center justify-center text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-white text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-6 h-6 bg-dark border border-dark-border rounded text-gray-400 hover:text-white flex items-center justify-center text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-white min-w-[70px] text-right">
                      {formatMXN(item.priceCents * item.quantity)}
                    </span>
                    <button onClick={() => removeFromCart(item.productId)} className="text-gray-600 hover:text-error transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Services for this item */}
                  {itemServices.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-dark-border/50 space-y-1">
                      {itemServices.map((svc) => (
                        <div key={`${svc.serviceId}-${svc.parentProductId}`} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> {svc.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">
                              {formatMXN(svc.perUnit ? svc.priceCents * item.quantity : svc.priceCents)}
                            </span>
                            <button
                              onClick={() => removeService(svc.serviceId, svc.parentProductId)}
                              className="text-gray-600 hover:text-error"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-dark-card border-t border-dark-border p-5">
            <div className="space-y-1 mb-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Llantas</span>
                <span>{formatMXN(subtotal)}</span>
              </div>
              {servicesCost > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Servicios</span>
                  <span>{formatMXN(servicesCost)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-dark-border">
                <span className="text-white font-bold">Total</span>
                <span className="text-xl font-bold text-brand">{formatMXN(total)}</span>
              </div>
            </div>
            <Link
              href="/checkout"
              onClick={onClose}
              className="block w-full bg-brand hover:bg-brand-dark text-black font-bold py-3 rounded-lg text-center text-sm transition-colors"
            >
              Ir al Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
