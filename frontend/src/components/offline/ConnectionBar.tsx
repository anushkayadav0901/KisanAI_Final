import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  WifiOff,
  Signal,
  UploadCloud,
  Check,
  RefreshCw,
  Trash2,
  ImageOff,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { useConnection } from "../../hooks/useConnection";
import {
  listQueue,
  onQueueChange,
  remove,
  clearQueue,
  flushQueue,
  type QueuedDiagnosis,
} from "../../utils/offlineQueue";

const KIND_LABEL: Record<QueuedDiagnosis["kind"], string> = {
  crop: "Crop health",
  soil: "Soil",
  thermal: "Thermal",
  field: "Field survey",
};

function ago(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const ConnectionBar: React.FC = () => {
  const { online, slow, effectiveType, dataSaver, dataSaverForced, toggleDataSaver } =
    useConnection();

  const [queue, setQueue] = React.useState<QueuedDiagnosis[]>([]);
  const [open, setOpen] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);

  const refresh = React.useCallback(() => {
    listQueue()
      .then(setQueue)
      .catch(() => setQueue([]));
  }, []);

  React.useEffect(() => {
    refresh();
    return onQueueChange(refresh);
  }, [refresh]);

  React.useEffect(() => {
    if (!online || queue.length === 0 || syncing) return;

    let cancelled = false;
    setSyncing(true);

    flushQueue(async (entry) => {
      const res = await fetch("/api/ai/analyze-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: entry.image }),
      });
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
    })
      .then(({ synced, failed }) => {
        if (cancelled) return;
        if (synced > 0) {
          toast.success(
            `${synced} offline ${synced === 1 ? "capture" : "captures"} synced`,
            { duration: 3000 },
          );
        }
        if (failed > 0 && synced === 0) {
          toast(`${failed} capture${failed === 1 ? "" : "s"} still waiting`, {
            duration: 2600,
          });
        }
      })
      .finally(() => !cancelled && setSyncing(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, queue.length]);

  const pending = queue.filter((q) => q.status !== "failed").length;
  const failed = queue.filter((q) => q.status === "failed").length;

  const visible = !online || slow || dataSaverForced || queue.length > 0;
  if (!visible) return null;

  const tone = !online
    ? { bg: "bg-[#5B532C]", text: "text-white", label: "Offline" }
    : slow
      ? { bg: "bg-[#FFC50F]", text: "text-[#5B532C]", label: `Slow connection (${effectiveType})` }
      : { bg: "bg-[#63A361]", text: "text-white", label: "Online" };

  return (
    <div className="fixed top-[76px] left-0 right-0 z-40 px-4 pointer-events-none">
      <div className="max-w-2xl mx-auto pointer-events-auto">
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-2xl shadow-lg shadow-[#5B532C]/10 overflow-hidden border border-[#5B532C]/10 bg-white"
        >
          {                  }
          <div className={`flex items-center gap-3 px-4 py-2.5 ${tone.bg} ${tone.text}`}>
            {!online ? (
              <WifiOff className="w-4 h-4 shrink-0" />
            ) : (
              <Signal className="w-4 h-4 shrink-0" />
            )}
            <span className="text-xs font-bold">{tone.label}</span>

            {!online && (
              <span className="text-xs opacity-80 hidden sm:inline">
                — captures are saved on this device and sent when signal returns
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {queue.length > 0 && (
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold
                             rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  {syncing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3 h-3" />
                  )}
                  {pending > 0 ? `${pending} waiting` : `${failed} failed`}
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
              )}

              <button
                onClick={toggleDataSaver}
                title="Reduce image quality and skip heavy assets"
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors ${
                  dataSaver
                    ? "bg-white text-[#4A8A4D]"
                    : "bg-white/20 hover:bg-white/30"
                }`}
              >
                {dataSaver ? "Data saver on" : "Data saver"}
              </button>
            </div>
          </div>

          {                  }
          <AnimatePresence initial={false}>
            {open && queue.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <div className="max-h-64 overflow-y-auto divide-y divide-[#5B532C]/8">
                  {queue.map((q) => (
                    <div key={q.id} className="flex items-center gap-3 px-4 py-2.5">
                      {q.image ? (
                        <img
                          src={q.image}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-[#5B532C]/10 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#FDE7B3]/40 flex items-center justify-center shrink-0">
                          <ImageOff className="w-4 h-4 text-[#5B532C]/40" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#5B532C]">
                          {KIND_LABEL[q.kind]}
                          {q.status === "failed" && (
                            <span className="ml-2 text-[#B3332E]">· failed</span>
                          )}
                          {q.status === "syncing" && (
                            <span className="ml-2 text-[#4A8A4D]">· sending</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#5B532C]/50 truncate">
                          {ago(q.capturedAt)}
                          {q.location &&
                            ` · ${q.location.lat.toFixed(3)}, ${q.location.lon.toFixed(3)}`}
                          {q.lastError && ` · ${q.lastError}`}
                        </div>
                      </div>

                      <button
                        onClick={() => remove(q.id)}
                        className="p-1.5 rounded-lg text-[#5B532C]/35 hover:text-[#B3332E]
                                   hover:bg-[#D64545]/8 transition-colors shrink-0"
                        title="Discard this capture"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between px-4 py-2 bg-[#FDFCF8] border-t border-[#5B532C]/8">
                  <span className="text-[11px] text-[#5B532C]/45">
                    Stored on this device only, never uploaded until you have signal.
                  </span>
                  <button
                    onClick={() => {
                      clearQueue();
                      toast.success("Queue cleared");
                    }}
                    className="text-[11px] font-semibold text-[#5B532C]/50 hover:text-[#B3332E]"
                  >
                    Clear all
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export const SavedOfflineBadge: React.FC<{ count: number }> = ({ count }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#63A361]/12 text-[#4A8A4D] text-xs font-bold">
    <Check className="w-3.5 h-3.5" />
    Saved on device ({count} waiting)
  </span>
);
