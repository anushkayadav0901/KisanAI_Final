/**
 * Consent — the farmer's data wallet
 *
 * Shows who holds access to this farmer's data, on what basis, for how long,
 * and every time it has actually been read. Revocation is one tap and takes
 * effect on the next request, not at some later sync.
 *
 * The design principle: a consent screen that is easier to grant on than to
 * revoke on is not a consent screen. Revoke is a first-class action here, and
 * the denial entries in the trail are shown as prominently as the successful
 * reads, because "someone tried to read my data after I said no" is the thing
 * a farmer most needs to be able to see.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Ban,
  Clock,
  Building2,
  Landmark,
  Store,
  FlaskConical,
  ChevronDown,
  AlertCircle,
  Check,
  X,
  Fingerprint,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Footer from "../components/Footer";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Consent {
  id: string;
  dataConsumer: { id: string; name: string; type: string };
  purpose: { code: string; label: string; text: string };
  dataTypes: string[];
  granularity: { identity: string; location: string };
  validity: { from: string; to: string };
  status: "active" | "revoked" | "expired";
  createdAt: string;
  revokedAt: string | null;
  revocationReason?: string;
  accessCount: number;
  signature: string;
}

interface AuditEntry {
  at: string;
  consentId: string;
  action: string;
  consumer: string;
  purpose: string;
  dataTypes: string[];
  result: "allowed" | "denied";
  note: string;
}

interface DataTypeInfo {
  code: string;
  label: string;
  sensitivity: "low" | "medium" | "high";
  detail: string;
}

// ── Presentation helpers ──────────────────────────────────────────────────────

const CONSUMER_ICON: Record<string, React.ElementType> = {
  government: Landmark,
  extension: Building2,
  commercial: Store,
  research: FlaskConical,
};

const SENSITIVITY = {
  low: { label: "Low", color: "#4A8A4D", soft: "rgba(99,163,97,0.12)" },
  medium: { label: "Medium", color: "#A57D00", soft: "rgba(255,197,15,0.16)" },
  high: { label: "High", color: "#B3332E", soft: "rgba(214,69,69,0.12)" },
};

const STATUS = {
  active: { label: "Active", color: "#4A8A4D", soft: "rgba(99,163,97,0.12)" },
  revoked: { label: "Revoked", color: "#B3332E", soft: "rgba(214,69,69,0.12)" },
  expired: { label: "Expired", color: "#5B532C", soft: "rgba(91,83,44,0.08)" },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function daysLeft(to: string) {
  const d = Math.ceil((new Date(to).getTime() - Date.now()) / 86400000);
  return d > 0 ? d : 0;
}

// ── Consent card ──────────────────────────────────────────────────────────────

const ConsentCard: React.FC<{
  consent: Consent;
  types: Record<string, DataTypeInfo>;
  onRevoke: (id: string) => void;
}> = ({ consent, types, onRevoke }) => {
  const [open, setOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  const Icon = CONSUMER_ICON[consent.dataConsumer.type] ?? Building2;
  const status = STATUS[consent.status];
  const isActive = consent.status === "active";

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl border border-[#5B532C]/10 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: status.soft }}
          >
            <Icon className="w-6 h-6" style={{ color: status.color }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[#5B532C]">
                {consent.dataConsumer.name}
              </h3>
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                style={{ background: status.soft, color: status.color }}
              >
                {status.label}
              </span>
            </div>

            <p className="text-sm text-[#5B532C]/60 mt-1.5 leading-relaxed">
              {consent.purpose.text}
            </p>

            <div className="flex items-center gap-4 mt-3 flex-wrap text-xs text-[#5B532C]/50">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {isActive
                  ? `${daysLeft(consent.validity.to)} days left`
                  : consent.status === "revoked"
                    ? `Revoked ${fmtDate(consent.revokedAt!)}`
                    : `Expired ${fmtDate(consent.validity.to)}`}
              </span>
              <span>
                Read <strong className="text-[#5B532C]/70">{consent.accessCount}</strong>{" "}
                {consent.accessCount === 1 ? "time" : "times"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5" />
                {consent.granularity.identity}
              </span>
            </div>
          </div>
        </div>

        {/* Data types with sensitivity */}
        <div className="flex flex-wrap gap-2 mt-4">
          {consent.dataTypes.map((code) => {
            const info = types[code];
            const s = SENSITIVITY[info?.sensitivity ?? "medium"];
            return (
              <span
                key={code}
                title={info?.detail}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold"
                style={{ background: s.soft, color: s.color }}
              >
                {info?.label ?? code}
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5 mt-4">
          {isActive &&
            (confirming ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#5B532C]/70">
                  Revoke access?
                </span>
                <button
                  onClick={() => {
                    onRevoke(consent.id);
                    setConfirming(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold
                             text-white bg-[#D64545] rounded-full hover:bg-[#b3332e] transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Yes, revoke
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold
                             text-[#5B532C] bg-white border-2 border-[#5B532C]/15 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                  Keep
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold
                           text-[#B3332E] bg-[#D64545]/10 rounded-full hover:bg-[#D64545]/20 transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                Revoke access
              </button>
            ))}

          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#5B532C]
                       bg-white border-2 border-[#5B532C]/15 rounded-full hover:border-[#63A361]/40
                       hover:bg-[#FDE7B3]/30 transition-colors ml-auto"
          >
            Consent artefact
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[#5B532C]/10 bg-[#FDFCF8]"
          >
            <dl className="p-5 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
              {[
                ["Artefact id", consent.id],
                ["Purpose code", consent.purpose.code],
                ["Granted", fmtDate(consent.createdAt)],
                ["Valid until", fmtDate(consent.validity.to)],
                ["Identity granularity", consent.granularity.identity],
                ["Location granularity", consent.granularity.location],
                ["Signature", consent.signature],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[#5B532C]/45 font-medium">{k}</dt>
                  <dd className="text-[#5B532C]/80 font-mono text-[11px] mt-0.5 break-all">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            {consent.revocationReason && (
              <p className="px-5 pb-4 text-xs text-[#B3332E]">
                {consent.revocationReason}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const Consent: React.FC = () => {
  const [consents, setConsents] = React.useState<Consent[]>([]);
  const [audit, setAudit] = React.useState<AuditEntry[]>([]);
  const [types, setTypes] = React.useState<Record<string, DataTypeInfo>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      // cache: "no-store" alongside the server's no-store header. Belt and
      // braces is warranted here: a stale consent list tells a farmer something
      // false about their own rights, and an entry cached before the header was
      // corrected would otherwise survive its full TTL.
      const opts: RequestInit = { cache: "no-store" };
      const [cRes, aRes, vRes] = await Promise.all([
        fetch("/v1/consent", opts),
        fetch("/v1/consent/audit", opts),
        fetch("/v1/consent/vocabulary", opts),
      ]);
      if (!cRes.ok) throw new Error(`Consent API returned ${cRes.status}`);

      const c = await cRes.json();
      const a = await aRes.json();
      const v = await vRes.json();

      setConsents(c.consents ?? []);
      setAudit(a.entries ?? []);
      setTypes(
        Object.fromEntries(
          (v.dataTypes ?? []).map((d: DataTypeInfo) => [d.code, d]),
        ),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the consent API");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const revoke = async (id: string) => {
    try {
      const res = await fetch(`/v1/consent/${id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Revoked by the farmer" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      toast.success("Access revoked — the next request will be refused", {
        duration: 3200,
      });
      load();
    } catch {
      toast.error("Could not revoke — the consent API is not reachable");
    }
  };

  const active = consents.filter((c) => c.status === "active");
  const past = consents.filter((c) => c.status !== "active");
  const denied = audit.filter((e) => e.result === "denied");

  return (
    <div className="relative bg-white">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#FFFFFF",
            color: "#5B532C",
            border: "1px solid rgba(91,83,44,0.12)",
            borderRadius: "16px",
            fontSize: "13px",
            fontWeight: 500,
          },
          success: { iconTheme: { primary: "#63A361", secondary: "#FFFFFF" } },
        }}
      />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-14">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage: "radial-gradient(circle, #5B532C 1.2px, transparent 1.2px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="absolute top-10 left-1/3 w-96 h-96 bg-[#63A361]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative px-4 mx-auto max-w-5xl sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#63A361] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              DEPA-aligned consent
            </span>

            <h1 className="text-4xl sm:text-5xl font-bold text-[#5B532C] leading-[1.12] mt-4 mb-5">
              Your data,{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[#63A361] px-2">your decision</span>
                <span className="absolute inset-0 bg-[#FDE7B3]/50 rounded-lg -rotate-1" />
              </span>
            </h1>

            <p className="text-base text-[#5B532C]/60 leading-relaxed max-w-2xl">
              Every organisation that can read your farm data is listed here, with
              exactly what they can see and why. Withdraw access at any time — the
              refusal applies to their very next request, not at some later sync.
            </p>
          </motion.div>
        </div>
      </section>

      {error && (
        <div className="px-4 mx-auto max-w-5xl sm:px-6 lg:px-8 pb-8">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#D64545]/8 border border-[#D64545]/20">
            <AlertCircle className="w-5 h-5 text-[#B3332E] shrink-0 mt-0.5" />
            <p className="text-sm text-[#5B532C]/70">
              {error}. This page reads live from{" "}
              <code className="font-semibold">/v1/consent</code>, so the backend needs
              to be running.
            </p>
          </div>
        </div>
      )}

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#FDFCF8] border-y border-[#5B532C]/10">
        <div className="px-4 mx-auto max-w-5xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-10">
            {[
              { value: String(active.length), label: "Active grants", sub: "can read your data now" },
              { value: String(consents.length - active.length), label: "Withdrawn", sub: "no longer have access" },
              { value: String(audit.length), label: "Audit entries", sub: "every access, logged" },
              { value: String(denied.length), label: "Blocked attempts", sub: "refused by your decision" },
            ].map((s) => (
              <div key={s.label} className="text-center lg:text-left">
                <div className="text-4xl font-bold text-[#5B532C] mb-1">{s.value}</div>
                <div className="text-sm font-medium text-[#5B532C]">{s.label}</div>
                <div className="text-xs text-[#5B532C]/50 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Grants ────────────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="px-4 mx-auto max-w-5xl sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#5B532C] mb-6">
            Who can read your data
          </h2>

          {loading ? (
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-44 bg-white rounded-2xl border border-[#5B532C]/10 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {active.map((c) => (
                <ConsentCard key={c.id} consent={c} types={types} onRevoke={revoke} />
              ))}
              {active.length === 0 && !error && (
                <p className="text-sm text-[#5B532C]/50 py-8 text-center">
                  No organisation currently has access to your data.
                </p>
              )}
            </div>
          )}

          {past.length > 0 && (
            <>
              <h2 className="text-2xl font-bold text-[#5B532C] mt-12 mb-6">
                Past access
              </h2>
              <div className="space-y-4 opacity-75">
                {past.map((c) => (
                  <ConsentCard key={c.id} consent={c} types={types} onRevoke={revoke} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Audit trail ───────────────────────────────────────────────────── */}
      <section className="py-16 bg-[#FDFCF8] border-t border-[#5B532C]/10">
        <div className="px-4 mx-auto max-w-5xl sm:px-6 lg:px-8">
          <div className="mb-6">
            <span className="text-xs font-semibold text-[#63A361] uppercase tracking-wider">
              Nothing happens invisibly
            </span>
            <h2 className="text-2xl font-bold text-[#5B532C] mt-2">Access log</h2>
            <p className="text-sm text-[#5B532C]/55 mt-1.5">
              Every read, grant, withdrawal and blocked attempt, in order.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#5B532C]/10 overflow-hidden">
            {audit.slice(0, 20).map((e, i) => {
              const denied = e.result === "denied";
              return (
                <div
                  key={`${e.at}-${i}`}
                  className={`flex items-start gap-3.5 px-5 py-3.5 ${
                    i > 0 ? "border-t border-[#5B532C]/8" : ""
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: denied ? "rgba(214,69,69,0.1)" : "rgba(99,163,97,0.1)",
                    }}
                  >
                    {denied ? (
                      <Ban className="w-4 h-4 text-[#B3332E]" />
                    ) : (
                      <Check className="w-4 h-4 text-[#4A8A4D]" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#5B532C]">
                        {e.consumer}
                      </span>
                      <span
                        className="text-[11px] font-bold uppercase tracking-wide"
                        style={{ color: denied ? "#B3332E" : "#4A8A4D" }}
                      >
                        {e.action.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-[#5B532C]/55 mt-0.5">{e.note}</p>
                  </div>

                  <span className="text-[11px] text-[#5B532C]/40 shrink-0 mt-0.5">
                    {fmtTime(e.at)}
                  </span>
                </div>
              );
            })}
            {audit.length === 0 && (
              <p className="px-5 py-10 text-sm text-[#5B532C]/45 text-center">
                No access recorded yet.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Note ──────────────────────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="px-4 mx-auto max-w-5xl sm:px-6 lg:px-8">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#FDE7B3]/25 border border-[#5B532C]/10">
            <div className="w-10 h-10 rounded-xl bg-[#FFC50F]/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#A57D00]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#5B532C] mb-1">
                Consent is enforced, not just recorded
              </h4>
              <p className="text-sm text-[#5B532C]/60 leading-relaxed">
                Every read of farm data passes through a check against the consent
                artefact — status, expiry, purpose and the exact data types requested.
                A request outside the grant is refused with the reason, and the refusal
                is logged above. Revoking here changes the outcome of the next request,
                with no other part of the system able to bypass it. Consent records are
                held in memory for this demo; the enforcement path is unchanged when
                they move to persistent storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Consent;
