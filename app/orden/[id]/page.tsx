"use client";

import { useState, useEffect, use } from "react";
import { formatMXN } from "@/lib/money";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, Package, FileText, Download } from "lucide-react";

interface TimelineEntry {
  id: string;
  source: string;
  level: string;
  message: string;
  createdAt: string;
  durationMs: number | null;
}

interface OrderData {
  id: string;
  folio: string;
  status: string;
  totalCents: number;
  email: string;
  branchId: string;
  branch: { name: string };
  createdAt: string;
  items: { qty: number; unitPriceCents: number; product?: { brand: string; model: string; width: number; aspectRatio: number; rim: number } }[];
  invoices: { id: string; uuid: string; folio: string; xml: string }[];
}

const STATUS_STEPS = [
  { key: "PENDIENTE_PAGO", label: "Pendiente de Pago", icon: Clock },
  { key: "PAGADO", label: "Pagado", icon: CheckCircle },
  { key: "SINCRONIZADO_ERP", label: "Sincronizado ERP", icon: Package },
  { key: "FACTURADO", label: "Facturado", icon: FileText },
];

function statusIndex(status: string): number {
  if (status === "COMPLETADO") return 3;
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function OrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [polling, setPolling] = useState(true);

  const fetchData = () => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.order) setOrder(d.order);
        if (d.timeline) setTimeline(d.timeline);
        if (d.order?.status === "FACTURADO" || d.order?.status === "COMPLETADO") {
          setPolling(false);
        }
      })
      .catch(() => {});
  };

  useEffect(() => { fetchData(); }, [id]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [polling]);

  if (!order) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentStep = statusIndex(order.status);
  const invoice = order.invoices?.[0];

  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-brand mb-6">
          <ArrowLeft className="w-4 h-4" /> Volver a la tienda
        </Link>

        {/* Order header */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Orden {order.folio}</h1>
              <p className="text-sm text-gray-400">{order.branch.name} · {new Date(order.createdAt).toLocaleString("es-MX")}</p>
            </div>
            <span className="text-2xl font-bold text-brand">{formatMXN(order.totalCents)}</span>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-0 mb-6">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStep;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex-1 flex items-center">
                  <div className={`flex flex-col items-center flex-1 ${done ? "" : "opacity-30"}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                      done ? "bg-brand/20 text-brand" : "bg-dark-border text-gray-500"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className={`text-[10px] text-center font-medium ${done ? "text-white" : "text-gray-600"}`}>{step.label}</p>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 rounded ${i < currentStep ? "bg-brand" : "bg-dark-border"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {polling && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 bg-brand rounded-full animate-pulse-dot" />
              Actualizando en tiempo real...
            </div>
          )}

          {/* Invoice download */}
          {invoice && (
            <div className="mt-4 p-4 bg-success/5 border border-success/20 rounded-xl">
              <p className="text-sm font-medium text-success mb-2">CFDI 4.0 Timbrado</p>
              <p className="text-xs text-gray-400 mb-3 font-mono">UUID: {invoice.uuid}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([invoice.xml], { type: "application/xml" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${invoice.folio}.xml`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 bg-success/10 text-success text-xs px-3 py-2 rounded-lg hover:bg-success/20 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar XML
                </button>
                <a
                  href={`/api/facturacion/pdf/${invoice.id}`}
                  download={`${invoice.folio}.pdf`}
                  className="flex items-center gap-1.5 bg-brand/10 text-brand text-xs px-3 py-2 rounded-lg hover:bg-brand/20 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" /> Descargar PDF
                </a>
              </div>
              <p className="text-[10px] text-gray-600 mt-2">DOCUMENTO SIN VALIDEZ FISCAL - DEMO</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">Timeline de la Orden</h3>
          <div className="space-y-2">
            {timeline.map((entry) => {
              const levelColor = entry.level === "SUCCESS" ? "text-success" : entry.level === "ERROR" ? "text-error" : entry.level === "PROCESSING" ? "text-warning" : "text-info";
              return (
                <div key={entry.id} className="flex items-start gap-3 text-sm">
                  <span className="text-[10px] text-gray-600 font-mono mt-0.5 min-w-[60px]">
                    {new Date(entry.createdAt).toLocaleTimeString("es-MX")}
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${levelColor} min-w-[12px]`}>
                    {entry.level === "SUCCESS" ? "OK" : entry.level === "ERROR" ? "!!" : entry.level === "PROCESSING" ? ">>" : "--"}
                  </span>
                  <span className="text-xs text-gray-300">{entry.message}</span>
                  {entry.durationMs && (
                    <span className="text-[10px] text-gray-600 ml-auto">{entry.durationMs}ms</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link href="/dashboard" className="text-sm text-brand hover:text-brand-dark">
            Ver Dashboard completo →
          </Link>
        </div>
      </div>
    </div>
  );
}
