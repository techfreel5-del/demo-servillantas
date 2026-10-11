"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatMXN } from "@/lib/money";
import { CheckCircle, XCircle, Clock, Copy, ArrowLeft } from "lucide-react";
import Link from "next/link";

async function signPayload(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function SimuladorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orden") || "";
  const [order, setOrder] = useState<{ folio: string; totalCents: number; status: string } | null>(null);
  const [processing, setProcessing] = useState("");
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.order ? { folio: d.order.folio, totalCents: d.order.totalCents, status: d.order.status } : null))
      .catch(() => {});
  }, [orderId]);

  const sendWebhook = async (event: string) => {
    setProcessing(event);
    setResult(null);
    const providerEventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const payload = JSON.stringify({ event, orderId, providerPaymentId: `pay_${Date.now()}`, gateway: "MercadoPago Sandbox", providerEventId });
    const signature = await signPayload(payload, "whsec_demo_123");

    try {
      const res = await fetch("/api/webhook/pagos", { method: "POST", headers: { "Content-Type": "application/json", "x-signature": signature }, body: payload });
      const data = await res.json();
      setResult(`${res.status} - ${JSON.stringify(data)}`);
      if (event === "payment.approved") setTimeout(() => router.push(`/orden/${orderId}`), 2000);
    } catch { setResult("Error de conexion"); }
    setProcessing("");
  };

  const sendDuplicate = async () => {
    setProcessing("duplicate");
    const providerEventId = `evt_dup_${Date.now()}`;
    const payload = JSON.stringify({ event: "payment.approved", orderId, providerPaymentId: `pay_dup_${Date.now()}`, gateway: "MercadoPago Sandbox", providerEventId });
    const signature = await signPayload(payload, "whsec_demo_123");
    const headers = { "Content-Type": "application/json", "x-signature": signature };
    const [r1, r2] = await Promise.all([
      fetch("/api/webhook/pagos", { method: "POST", headers, body: payload }),
      fetch("/api/webhook/pagos", { method: "POST", headers, body: payload }),
    ]);
    const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
    setResult(`1er: ${r1.status} ${JSON.stringify(d1)}\n2do: ${r2.status} ${JSON.stringify(d2)}`);
    setProcessing("");
    setTimeout(() => router.push(`/orden/${orderId}`), 2000);
  };

  if (!orderId) return <div className="min-h-screen bg-dark flex items-center justify-center"><p className="text-gray-500">No se especifico una orden</p></div>;

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
          <div className="bg-brand/10 border-b border-brand/20 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-brand font-medium">PASARELA DE PAGO SIMULADA</p>
                <p className="text-lg font-bold text-white mt-1">{order ? formatMXN(order.totalCents) : "Cargando..."}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Orden</p>
                <p className="text-sm font-mono text-white">{order?.folio || "..."}</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <p className="text-sm text-gray-400 mb-4">Simula la respuesta de la pasarela. Cada boton envia un webhook firmado con HMAC-SHA256.</p>
            <button onClick={() => sendWebhook("payment.approved")} disabled={!!processing} className="w-full flex items-center gap-3 bg-success/10 border border-success/30 text-success px-4 py-3 rounded-xl hover:bg-success/20 transition-colors disabled:opacity-50">
              <CheckCircle className="w-5 h-5" /><div className="text-left"><p className="font-semibold text-sm">Aprobar Pago</p><p className="text-xs opacity-70">Dispara pipeline: payment.approved → ERP → CFDI</p></div>
            </button>
            <button onClick={() => sendWebhook("payment.rejected")} disabled={!!processing} className="w-full flex items-center gap-3 bg-error/10 border border-error/30 text-error px-4 py-3 rounded-xl hover:bg-error/20 transition-colors disabled:opacity-50">
              <XCircle className="w-5 h-5" /><div className="text-left"><p className="font-semibold text-sm">Rechazar Pago</p><p className="text-xs opacity-70">Libera reservas de inventario</p></div>
            </button>
            <button onClick={() => sendWebhook("payment.pending")} disabled={!!processing} className="w-full flex items-center gap-3 bg-warning/10 border border-warning/30 text-warning px-4 py-3 rounded-xl hover:bg-warning/20 transition-colors disabled:opacity-50">
              <Clock className="w-5 h-5" /><div className="text-left"><p className="font-semibold text-sm">Dejar Pendiente (SPEI/OXXO)</p><p className="text-xs opacity-70">TTL extendido a 48h</p></div>
            </button>
            <button onClick={sendDuplicate} disabled={!!processing} className="w-full flex items-center gap-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 px-4 py-3 rounded-xl hover:bg-purple-500/20 transition-colors disabled:opacity-50">
              <Copy className="w-5 h-5" /><div className="text-left"><p className="font-semibold text-sm">Enviar Webhook Duplicado</p><p className="text-xs opacity-70">Demuestra deduplicacion por providerEventId</p></div>
            </button>
            {processing && <div className="flex items-center gap-2 text-sm text-gray-400 animate-pulse"><div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />Enviando webhook...</div>}
            {result && <pre className="bg-dark/50 border border-dark-border rounded-lg p-3 text-xs text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap">{result}</pre>}
          </div>
          <div className="border-t border-dark-border px-6 py-3 flex justify-between">
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Volver</Link>
            <Link href="/dashboard" className="text-xs text-brand hover:text-brand-dark">Ver Dashboard →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PagoSimuladorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>}>
      <SimuladorContent />
    </Suspense>
  );
}
