"use client";

import Link from "next/link";
import Image from "next/image";
import { useStore } from "@/lib/store";
import { formatMXN } from "@/lib/money";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, MapPin, ChevronDown, LayoutDashboard, Search, GitCompare } from "lucide-react";
import CartDrawer from "./CartDrawer";

interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
}

export default function Header() {
  const router = useRouter();
  const { branchId, branchName, setBranch, cartCount, cartTotalCents, compareIds } = useStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showBranches, setShowBranches] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const count = cartCount();
  const total = cartTotalCents();

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then(setBranches)
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Check if it matches a tire size pattern like "205/55R16" or "205 55 16"
    const sizeMatch = searchQuery.match(/(\d{3})\D*(\d{2})\D*[rR]?(\d{2})/);
    if (sizeMatch) {
      router.push(`/llantas/${sizeMatch[1]}-${sizeMatch[2]}-r${sizeMatch[3]}`);
    } else {
      router.push(`/llantas/buscar?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    setSearchQuery("");
  };

  return (
    <>
      <header className="bg-brand sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image src="/logo.svg" alt="RodaMax Llantas" width={160} height={36} className="h-9 w-auto" priority />
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar (Ej: 205/55R16, Bridgestone)"
                className="w-full pl-9 pr-4 py-2 bg-black/20 border border-black/10 rounded-lg text-sm text-white placeholder:text-black/40 focus:outline-none focus:bg-black/30"
              />
            </div>
          </form>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-semibold text-black/80">
            <Link href="/" className="hover:text-black transition-colors">LLANTAS</Link>
            <Link href="/sucursales" className="hover:text-black transition-colors">SUCURSALES</Link>
          </nav>

          {/* Branch selector */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowBranches(!showBranches)}
              className="flex items-center gap-1.5 bg-black/15 px-3 py-1.5 rounded-lg hover:bg-black/25 transition-colors text-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-black/70" />
              <span className="text-black/90 font-medium hidden sm:inline">{branchName}</span>
              <ChevronDown className="w-3 h-3 text-black/60" />
            </button>
            {showBranches && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowBranches(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden z-50">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { setBranch(b.id, b.name); setShowBranches(false); }}
                      className={`w-full text-left px-4 py-3 hover:bg-dark-surface/50 transition-colors border-b border-dark-border last:border-0 ${
                        b.id === branchId ? "bg-brand/10 border-l-2 border-l-brand" : ""
                      }`}
                    >
                      <div className="text-sm font-medium text-white">{b.name}</div>
                      <div className="text-xs text-gray-500">{b.address}, {b.city}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Compare + Dashboard + Cart */}
          <div className="flex items-center gap-2">
            {compareIds.length > 0 && (
              <Link
                href="/comparar"
                className="relative p-2 rounded-lg bg-black/15 hover:bg-black/25 transition-colors"
                title="Comparar"
              >
                <GitCompare className="w-4.5 h-4.5 text-black/70" />
                <span className="absolute -top-1 -right-1 bg-info text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {compareIds.length}
                </span>
              </Link>
            )}
            <Link
              href="/dashboard"
              className="p-2 rounded-lg bg-black/15 hover:bg-black/25 transition-colors"
              title="Dashboard"
            >
              <LayoutDashboard className="w-4.5 h-4.5 text-black/70" />
            </Link>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 bg-black text-brand px-3 py-2 rounded-lg hover:bg-black/90 transition-colors"
            >
              <ShoppingCart className="w-4.5 h-4.5" />
              {count > 0 && (
                <>
                  <span className="text-xs font-bold">{formatMXN(total)}</span>
                  <span className="absolute -top-1.5 -right-1.5 bg-brand text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {count}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
