"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  brand: string;
  model: string;
  measure: string;
  priceCents: number;
  quantity: number;
  image: string;
  slug: string;
}

export interface CartService {
  serviceId: string;
  code: string;
  name: string;
  priceCents: number;
  perUnit: boolean;
  parentProductId: string;
}

interface StoreState {
  branchId: string;
  branchName: string;
  cart: CartItem[];
  services: CartService[];
  compareIds: string[];
  setBranch: (id: string, name: string) => void;
  addToCart: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  addService: (service: CartService) => void;
  removeService: (serviceId: string, parentProductId: string) => void;
  clearCart: () => void;
  toggleCompare: (productId: string) => void;
  clearCompare: () => void;
  cartSubtotalCents: () => number;
  cartServicesCents: () => number;
  cartTotalCents: () => number;
  cartCount: () => number;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      branchId: "branch-cen",
      branchName: "Sucursal Centro",
      cart: [],
      services: [],
      compareIds: [],

      setBranch: (id, name) =>
        set({ branchId: id, branchName: name, cart: [], services: [] }),

      addToCart: (item, qty = 1) =>
        set((s) => {
          const existing = s.cart.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              cart: s.cart.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + qty }
                  : i
              ),
            };
          }
          return { cart: [...s.cart, { ...item, quantity: qty }] };
        }),

      removeFromCart: (productId) =>
        set((s) => ({
          cart: s.cart.filter((i) => i.productId !== productId),
          services: s.services.filter((sv) => sv.parentProductId !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((s) => {
          if (quantity <= 0) {
            return {
              cart: s.cart.filter((i) => i.productId !== productId),
              services: s.services.filter((sv) => sv.parentProductId !== productId),
            };
          }
          return {
            cart: s.cart.map((i) =>
              i.productId === productId ? { ...i, quantity } : i
            ),
          };
        }),

      addService: (service) =>
        set((s) => {
          const exists = s.services.find(
            (sv) =>
              sv.serviceId === service.serviceId &&
              sv.parentProductId === service.parentProductId
          );
          if (exists) return s;
          return { services: [...s.services, service] };
        }),

      removeService: (serviceId, parentProductId) =>
        set((s) => ({
          services: s.services.filter(
            (sv) =>
              !(sv.serviceId === serviceId && sv.parentProductId === parentProductId)
          ),
        })),

      clearCart: () => set({ cart: [], services: [] }),

      toggleCompare: (productId) =>
        set((s) => {
          if (s.compareIds.includes(productId)) {
            return { compareIds: s.compareIds.filter((id) => id !== productId) };
          }
          if (s.compareIds.length >= 3) return s;
          return { compareIds: [...s.compareIds, productId] };
        }),

      clearCompare: () => set({ compareIds: [] }),

      cartSubtotalCents: () =>
        get().cart.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),

      cartServicesCents: () => {
        const { cart, services } = get();
        return services.reduce((sum, sv) => {
          if (sv.perUnit) {
            const parent = cart.find((i) => i.productId === sv.parentProductId);
            return sum + sv.priceCents * (parent?.quantity || 1);
          }
          return sum + sv.priceCents;
        }, 0);
      },

      cartTotalCents: () => get().cartSubtotalCents() + get().cartServicesCents(),

      cartCount: () => get().cart.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "rodamax-cart",
      partialize: (state) => ({
        branchId: state.branchId,
        branchName: state.branchName,
        cart: state.cart,
        services: state.services,
        compareIds: state.compareIds,
      }),
    }
  )
);
