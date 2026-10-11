"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { formatMXN } from "@/lib/money";
import {
  ArrowLeft, Play, Pause, Trash2, RefreshCw, Zap, AlertTriangle,
  RotateCcw, Database, Package, Activity, Flame, ShieldAlert,
  TrendingUp, Box, ChevronDown, ChevronRight,
} from "lucide-react";

interface AuditLog {
  id: string;
  correlationId: string;
  orderId: string | null;
  source: string;
  level: string;
  httpStatus: number | null;
  message: string;
  durationMs: number | null;
  metadata: string;
  createdAt: string;
}

interface RecentOrder {
  id: string;
  folio: string;
  status: string;
  totalCents: number;
  createdAt: string;
}

interface FullOrder {
  id: string;
  folio: string;
  status: string;
  totalCents: number;
  branchId: string;
  branch: { name: string };
  createdAt: string;
  items: { qty: number; product?: { brand: string; model: string } | null }[];
}

interface DLQEvent {
  id: string;
  type: string;
  aggregateId: string;
  correlationId: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

interface InventoryEntry {
  productId: string;
  sku: string;
  brand: string;
  model: string;
  measure: string;
  branches: { branchId: string; branchCode: string; branchName: string; physical: number; reserved: number; available: number }[];
}

interface InventoryData {
  branches: { id: string; code: string; name: string }[];
  matrix: InventoryEntry[];
  summary: { totalProducts: number; totalBranches: number; totalPhysical: number; totalReserved: number; totalAvailable: number };
}

const LEVEL_STYLES: Record<string, { color: string; bg: string; tag: string }> = {
  INFO: { color: "text-blue-400", bg: "bg-blue-500/10", tag: "INFO" },
  PROCESSING: { color: "text-yellow-400", bg: "bg-yellow-500/10", tag: "PROC" },
  SUCCESS: { color: "text-emerald-400", bg: "bg-emerald-500/10", tag: "OK" },
  WARN: { color: "text-orange-400", bg: "bg-orange-500/10", tag: "WARN" },
  ERROR: { color: "text-red-400", bg: "bg-red-500/10", tag: "ERR" },
};

const SOURCE_STYLES: Record<string, string> = {
  CHECKOUT: "text-brand",
  INVENTORY: "text-cyan-400",
  PAYMENT_GW: "text-purple-400",
  WEBHOOK: "text-violet-400",
  QUEUE: "text-sky-400",
  ERP: "text-orange-400",
  PAC: "text-emerald-400",
  SYSTEM: "text-gray-400",
};

const STATUS_COLORS: Record<string, string> = {
  PENDIENTE_PAGO: "text-yellow-400 bg-yellow-500/10",
  PAGADO: "text-blue-400 bg-blue-500/10",
  SINCRONIZADO_ERP: "text-orange-400 bg-orange-500/10",
  FACTURADO: "text-emerald-400 bg-emerald-500/10",
  COMPLETADO: "text-emerald-400 bg-emerald-500/10",
  PAGO_RECHAZADO: "text-red-400 bg-red-500/10",
  EXPIRADO: "text-gray-400 bg-gray-500/10",
};

export default function DashboardPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [orders, setOrders] = useState<FullOrder[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [queueStats, setQueueStats] = useState<Record<string, number>>({});
  const [dlq, setDlq] = useState<DLQEvent[]>([]);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [polling, setPolling] = useState(true);
  const [filterSource, setFilterSource] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [chaosRate, setChaosRate] = useState(0.2);
  const [activeTab, setActiveTab] = useState<"orders" | "inventory" | "chaos">("orders");
  const logEndRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, ordersRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/orders?limit=10"),
      ]);
      const eventsData = await eventsRes.json();
      const ordersData = await ordersRes.json();
      setLogs((eventsData.logs || []).reverse());
      setQueueStats(eventsData.queueStats || {});
      setDlq(eventsData.dlq || []);
      setRecentOrders(eventsData.recentOrders || []);
      setOrders(ordersData.orders || ordersData);
    } catch {}
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/matrix");
      setInventory(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchData(); fetchInventory(); }, [fetchData, fetchInventory]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [polling, fetchData]);

  useEffect(() => {
    if (logs.length > prevCount.current) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCount.current = logs.length;
  }, [logs.length]);

  const clearLogs = async () => {
    await fetch("/api/audit", { method: "DELETE" });
    setLogs([]);
  };

  const resetDemo = async () => {
    await fetch("/api/demo/reset?token=demo", { method: "POST" });
    setLogs([]); setOrders([]); setQueueStats({}); setDlq([]);
    setTimeout(() => { fetchData(); fetchInventory(); }, 1000);
  };

  const retryDLQ = async (eventId: string) => {
    await fetch("/api/queue/retry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId }) });
    fetchData();
  };

  const triggerQueueProcess = async () => {
    await fetch("/api/queue/process", { method: "POST" });
    setTimeout(fetchData, 500);
  };

  const filteredLogs = logs.filter((l) => {
    if (filterSource && l.source !== filterSource) return false;
    if (filterLevel && l.level !== filterLevel) return false;
    return true;
  });

  const queueTotal = Object.values(queueStats).reduce((a, b) => a + b, 0);
  const orderStatusDist = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  // Source distribution for sparkline
  const sourceCounts = logs.reduce((acc, l) => { acc[l.source] = (acc[l.source] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      {/* Header */}
      <header className="bg-dark-card border-b border-dark-border px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand" />
              Consola de Auditoria
              {polling && <span className="w-2 h-2 bg-success rounded-full animate-pulse-dot" />}
            </h1>
            <p className="text-[10px] text-gray-500">Event-Driven Architecture Monitor · RodaMax Llantas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPolling(!polling)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
            polling ? "border-success/30 text-success bg-success/10" : "border-dark-border text-gray-400"
          }`}>
            {polling ? <><Pause className="w-3 h-3" /> Live</> : <><Play className="w-3 h-3" /> Pausado</>}
          </button>
          <button onClick={triggerQueueProcess} className="px-2.5 py-1.5 rounded-lg text-xs border border-dark-border text-gray-400 hover:text-brand hover:border-brand/30 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Cola
          </button>
          <button onClick={clearLogs} className="px-2.5 py-1.5 rounded-lg text-xs border border-dark-border text-gray-400 hover:text-error hover:border-error/30 flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Limpiar
          </button>
          <button onClick={resetDemo} className="px-2.5 py-1.5 rounded-lg text-xs border border-dark-border text-gray-400 hover:text-warning hover:border-warning/30 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Column 1: Event Log (5 cols) */}
        <div className="lg:col-span-5 border-r border-dark-border flex flex-col">
          <div className="px-3 py-2 border-b border-dark-border bg-dark-card/50 flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-mono font-bold">EVENT LOG</span>
            <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="bg-dark border border-dark-border rounded px-1.5 py-0.5 text-[10px] text-gray-400 focus:outline-none">
              <option value="">Fuente</option>
              {Object.keys(SOURCE_STYLES).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="bg-dark border border-dark-border rounded px-1.5 py-0.5 text-[10px] text-gray-400 focus:outline-none">
              <option value="">Nivel</option>
              {Object.keys(LEVEL_STYLES).map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <span className="text-[9px] text-gray-600 ml-auto font-mono">{filteredLogs.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0 font-mono text-[11px] max-h-[calc(100vh-130px)]">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <Database className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-xs">Sin eventos</p>
                <p className="text-[10px]">Realiza una compra para ver el flujo</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const ls = LEVEL_STYLES[log.level] || LEVEL_STYLES.INFO;
                const sc = SOURCE_STYLES[log.source] || "text-gray-400";
                const hasMetadata = log.metadata && log.metadata !== "{}";
                return (
                  <div key={log.id} className="animate-slide-in">
                    <div
                      className="flex items-start gap-1.5 px-1.5 py-1 rounded hover:bg-dark-card/60 cursor-pointer transition-colors"
                      onClick={() => hasMetadata && setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <span className="text-gray-700 min-w-[55px] text-[10px]">
                        {new Date(log.createdAt).toLocaleTimeString("es-MX", { hour12: false })}
                      </span>
                      <span className={`min-w-[65px] font-bold text-[10px] ${sc}`}>{log.source}</span>
                      <span className={`${ls.bg} ${ls.color} px-1 rounded text-[9px] font-bold min-w-[28px] text-center`}>
                        {log.httpStatus || ls.tag}
                      </span>
                      <span className="text-gray-300 flex-1 leading-tight">{log.message}</span>
                      {log.durationMs && <span className="text-gray-700 text-[9px]">{log.durationMs}ms</span>}
                      {hasMetadata && (
                        expandedLog === log.id ? <ChevronDown className="w-3 h-3 text-gray-600" /> : <ChevronRight className="w-3 h-3 text-gray-700" />
                      )}
                    </div>
                    {expandedLog === log.id && hasMetadata && (
                      <pre className="ml-[56px] mb-1 text-[9px] text-gray-600 bg-dark/50 p-1.5 rounded overflow-x-auto max-h-32">
                        {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Column 2: Orders + DLQ (4 cols) */}
        <div className="lg:col-span-4 border-r border-dark-border flex flex-col overflow-hidden">
          {/* Queue Stats Bar */}
          <div className="px-3 py-2.5 border-b border-dark-border bg-dark-card/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-500 font-mono font-bold">COLA DE MENSAJES</span>
              <span className="text-[9px] text-gray-600">{queueTotal} total</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { key: "PENDING", label: "Pend", color: "text-yellow-400", bar: "bg-yellow-500" },
                { key: "PROCESSING", label: "Proc", color: "text-blue-400", bar: "bg-blue-500" },
                { key: "DONE", label: "OK", color: "text-emerald-400", bar: "bg-emerald-500" },
                { key: "FAILED", label: "Fail", color: "text-orange-400", bar: "bg-orange-500" },
                { key: "DEAD", label: "DLQ", color: "text-red-400", bar: "bg-red-500" },
              ].map((q) => {
                const count = queueStats[q.key] || 0;
                const pct = queueTotal > 0 ? (count / queueTotal) * 100 : 0;
                return (
                  <div key={q.key} className="text-center">
                    <span className={`text-sm font-bold ${q.color}`}>{count}</span>
                    <div className="h-1 bg-dark-border rounded-full mt-0.5 overflow-hidden">
                      <div className={`h-full rounded-full ${q.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[8px] text-gray-600 mt-0.5">{q.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DLQ */}
          {dlq.length > 0 && (
            <div className="px-3 py-2 border-b border-dark-border bg-red-500/5">
              <p className="text-[10px] text-red-400 font-mono mb-1.5 flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3 h-3" /> DEAD LETTER QUEUE ({dlq.length})
              </p>
              {dlq.map((e) => (
                <div key={e.id} className="flex items-center gap-2 py-1 text-[11px] border-b border-dark-border/30 last:border-0">
                  <span className="text-red-400 font-mono font-medium">{e.type}</span>
                  <span className="text-gray-600 text-[9px]">{e.attempts}x</span>
                  {e.lastError && <span className="text-gray-700 text-[9px] truncate max-w-[100px]" title={e.lastError}>{e.lastError}</span>}
                  <button onClick={() => retryDLQ(e.id)} className="ml-auto text-brand hover:text-brand-dark text-[10px] flex items-center gap-0.5 font-medium">
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tabs: Orders | Inventory | Chaos */}
          <div className="flex border-b border-dark-border">
            {[
              { key: "orders" as const, label: "Ordenes", icon: Package },
              { key: "inventory" as const, label: "Inventario", icon: Box },
              { key: "chaos" as const, label: "Chaos", icon: Flame },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); if (t.key === "inventory") fetchInventory(); }}
                className={`flex-1 py-2 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
                  activeTab === t.key ? "text-brand border-b-2 border-brand bg-brand/5" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <t.icon className="w-3 h-3" /> {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="p-2.5 space-y-2">
                {/* Status distribution */}
                {Object.keys(orderStatusDist).length > 0 && (
                  <div className="bg-dark/50 rounded-lg p-2.5 mb-2">
                    <p className="text-[9px] text-gray-500 font-mono mb-1.5">DISTRIBUCION</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(orderStatusDist).map(([status, count]) => (
                        <span key={status} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[status] || "text-gray-400"}`}>
                          {status.replace("_", " ")} ({count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {orders.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-8">Sin ordenes</p>
                ) : (
                  orders.map((order) => (
                    <Link key={order.id} href={`/orden/${order.id}`} className="block bg-dark-card border border-dark-border rounded-lg p-2.5 hover:border-brand/30 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono text-gray-400 font-medium">{order.folio}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[order.status] || "text-gray-400"}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500">{order.branch.name}</p>
                      {order.items.slice(0, 2).map((item, i) => (
                        <p key={i} className="text-[10px] text-gray-600">
                          {item.product ? `${item.product.brand} ${item.product.model}` : "Servicio"} x{item.qty}
                        </p>
                      ))}
                      <div className="flex justify-between mt-1.5 pt-1 border-t border-dark-border/50">
                        <span className="text-[9px] text-gray-600">{new Date(order.createdAt).toLocaleString("es-MX")}</span>
                        <span className="text-xs font-bold text-white">{formatMXN(order.totalCents)}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* Inventory Tab */}
            {activeTab === "inventory" && inventory && (
              <div className="p-2.5">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-dark/50 rounded-lg p-2 text-center">
                    <span className="text-lg font-bold text-white">{inventory.summary.totalPhysical}</span>
                    <p className="text-[8px] text-gray-500">Fisico</p>
                  </div>
                  <div className="bg-dark/50 rounded-lg p-2 text-center">
                    <span className="text-lg font-bold text-warning">{inventory.summary.totalReserved}</span>
                    <p className="text-[8px] text-gray-500">Reservado</p>
                  </div>
                  <div className="bg-dark/50 rounded-lg p-2 text-center">
                    <span className="text-lg font-bold text-success">{inventory.summary.totalAvailable}</span>
                    <p className="text-[8px] text-gray-500">Disponible</p>
                  </div>
                </div>

                {/* Matrix heatmap */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-dark-border">
                        <th className="py-1.5 px-1 text-left text-gray-500 font-medium">Producto</th>
                        {inventory.branches.map((b) => (
                          <th key={b.id} className="py-1.5 px-1 text-center text-gray-500 font-medium">{b.code}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.matrix.map((row) => (
                        <tr key={row.productId} className="border-b border-dark-border/30 hover:bg-dark-card/30">
                          <td className="py-1 px-1">
                            <span className="text-white font-medium">{row.brand}</span>
                            <span className="text-gray-600 ml-1">{row.measure}</span>
                          </td>
                          {row.branches.map((b) => {
                            let cellBg = "bg-gray-800/50";
                            let cellText = "text-gray-600";
                            if (b.available > 5) { cellBg = "bg-emerald-500/15"; cellText = "text-emerald-400"; }
                            else if (b.available > 0) { cellBg = "bg-yellow-500/15"; cellText = "text-yellow-400"; }
                            else if (b.physical > 0) { cellBg = "bg-red-500/10"; cellText = "text-red-400"; }
                            return (
                              <td key={b.branchId} className="py-1 px-1 text-center">
                                <span className={`inline-block w-full rounded px-1 py-0.5 font-mono font-bold ${cellBg} ${cellText}`}>
                                  {b.available}
                                  {b.reserved > 0 && <span className="text-[8px] text-gray-600">/{b.physical}</span>}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 mt-2 text-[8px] text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500/30 rounded" /> {">"}5</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500/30 rounded" /> 1-5</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500/20 rounded" /> Reservado</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-800/50 rounded" /> Sin stock</span>
                </div>
              </div>
            )}

            {/* Chaos Tab */}
            {activeTab === "chaos" && (
              <div className="p-3 space-y-4">
                <div className="bg-dark/50 border border-dark-border rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <ShieldAlert className="w-4 h-4 text-error" /> Chaos Engineering
                  </h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Simula fallos del ERP para probar el mecanismo de retry con backoff exponencial y Dead Letter Queue.
                  </p>

                  <div className="mb-4">
                    <label className="text-xs text-gray-400 mb-1 block">Tasa de fallos ERP: {Math.round(chaosRate * 100)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={chaosRate * 100}
                      onChange={(e) => setChaosRate(parseInt(e.target.value) / 100)}
                      className="w-full accent-brand"
                    />
                    <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                      <span>0% (estable)</span>
                      <span>50%</span>
                      <span>100% (fallo total)</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-gray-500 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-brand rounded-full" />
                      Backoff: 2^intentos * 2s (4s, 8s, 16s, 32s, 64s)
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-error rounded-full" />
                      Despues de 5 intentos fallidos → DLQ (Dead Letter Queue)
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-success rounded-full" />
                      Retry manual desde DLQ reinicia el contador
                    </p>
                  </div>
                </div>

                <div className="bg-dark/50 border border-dark-border rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-info" /> Metricas de Eventos
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).map(([source, count]) => {
                      const maxCount = Math.max(...Object.values(sourceCounts));
                      const pct = (count / maxCount) * 100;
                      return (
                        <div key={source} className="flex items-center gap-2 text-[11px]">
                          <span className={`min-w-[75px] font-mono font-bold ${SOURCE_STYLES[source] || "text-gray-400"}`}>{source}</span>
                          <div className="flex-1 h-2 bg-dark-border rounded-full overflow-hidden">
                            <div className="h-full bg-brand/40 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-gray-500 min-w-[24px] text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-dark/50 border border-dark-border rounded-xl p-4">
                  <h3 className="text-sm font-bold text-white mb-2">Pipeline</h3>
                  <div className="flex items-center gap-1 text-[9px] overflow-x-auto">
                    {[
                      { label: "Checkout", icon: "1", c: "bg-brand/20 text-brand" },
                      { label: "→", c: "text-gray-700" },
                      { label: "Webhook", icon: "2", c: "bg-purple-500/20 text-purple-400" },
                      { label: "→", c: "text-gray-700" },
                      { label: "Outbox", icon: "3", c: "bg-cyan-500/20 text-cyan-400" },
                      { label: "→", c: "text-gray-700" },
                      { label: "ERP", icon: "4", c: chaosRate > 0 ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-orange-500/20 text-orange-400" },
                      { label: "→", c: "text-gray-700" },
                      { label: "CFDI", icon: "5", c: "bg-emerald-500/20 text-emerald-400" },
                    ].map((step, i) => (
                      step.icon ? (
                        <span key={i} className={`px-2 py-1 rounded font-bold ${step.c}`}>{step.icon}. {step.label}</span>
                      ) : (
                        <span key={i} className={step.c}>{step.label}</span>
                      )
                    ))}
                  </div>
                  {chaosRate > 0 && (
                    <p className="text-[9px] text-red-400 mt-2 flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Chaos activo: ERP falla {Math.round(chaosRate * 100)}% de las veces
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Stats (3 cols) */}
        <div className="lg:col-span-3 flex flex-col overflow-hidden">
          {/* Pipeline Stats */}
          <div className="px-3 py-2.5 border-b border-dark-border bg-dark-card/50">
            <p className="text-[10px] text-gray-500 font-mono font-bold mb-2">RESUMEN</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-dark/50 rounded-lg p-2 text-center">
                <span className="text-xl font-bold text-white">{orders.length}</span>
                <p className="text-[8px] text-gray-500">Ordenes</p>
              </div>
              <div className="bg-dark/50 rounded-lg p-2 text-center">
                <span className="text-xl font-bold text-brand">{logs.length}</span>
                <p className="text-[8px] text-gray-500">Eventos</p>
              </div>
              <div className="bg-dark/50 rounded-lg p-2 text-center">
                <span className="text-xl font-bold text-success">{queueStats.DONE || 0}</span>
                <p className="text-[8px] text-gray-500">Completados</p>
              </div>
              <div className="bg-dark/50 rounded-lg p-2 text-center">
                <span className="text-xl font-bold text-error">{(queueStats.DEAD || 0) + (queueStats.FAILED || 0)}</span>
                <p className="text-[8px] text-gray-500">Errores</p>
              </div>
            </div>
          </div>

          {/* Source breakdown */}
          <div className="px-3 py-2.5 border-b border-dark-border">
            <p className="text-[10px] text-gray-500 font-mono font-bold mb-2">POR FUENTE</p>
            <div className="space-y-1">
              {Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between text-[10px]">
                  <span className={`font-mono ${SOURCE_STYLES[source] || "text-gray-400"}`}>{source}</span>
                  <span className="text-gray-500">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent orders mini list */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-2 border-b border-dark-border bg-dark-card/50 sticky top-0">
              <p className="text-[10px] text-gray-500 font-mono font-bold">ULTIMAS ORDENES</p>
            </div>
            <div className="p-2 space-y-1">
              {recentOrders.length === 0 ? (
                <p className="text-[10px] text-gray-600 text-center py-4">Sin ordenes</p>
              ) : (
                recentOrders.map((o) => (
                  <Link key={o.id} href={`/orden/${o.id}`} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-dark-card/50 transition-colors">
                    <div>
                      <span className="text-[10px] font-mono text-gray-400">{o.folio}</span>
                      <span className={`ml-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[o.status] || ""}`}>
                        {o.status}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-white">{formatMXN(o.totalCents)}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
