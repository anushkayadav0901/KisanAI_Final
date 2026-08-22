/**
 * useConnection — what the network is actually doing, and what to do about it
 *
 * `navigator.onLine` only answers "is there an interface up", which on a rural
 * 2G connection is close to useless — the phone reports online while a 3MB
 * upload has no chance of completing. The Network Information API gives the
 * effective connection type, so the app can degrade deliberately instead of
 * hanging and looking broken.
 *
 * Data-saver mode can be forced on by the farmer and is remembered; it is also
 * turned on automatically when the connection reports 2G or the OS data-saver
 * flag is set.
 */

import { useCallback, useEffect, useState } from "react";

type EffectiveType = "slow-2g" | "2g" | "3g" | "4g" | "unknown";

interface NetworkInformation extends EventTarget {
  effectiveType?: EffectiveType;
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
}

function getConnection(): NetworkInformation | undefined {
  return (
    navigator as Navigator & { connection?: NetworkInformation }
  ).connection;
}

const SAVER_KEY = "kisan_data_saver";

export interface ConnectionState {
  online: boolean;
  effectiveType: EffectiveType;
  /** True when the link is too weak for full-quality uploads. */
  slow: boolean;
  /** Round-trip estimate in ms, when the browser exposes it. */
  rtt?: number;
  /** Data-saver active, whether chosen by the farmer or forced by the network. */
  dataSaver: boolean;
  /** The farmer's explicit choice, independent of network conditions. */
  dataSaverForced: boolean;
  toggleDataSaver: () => void;
}

export function useConnection(): ConnectionState {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [effectiveType, setEffectiveType] = useState<EffectiveType>(
    () => getConnection()?.effectiveType ?? "unknown",
  );
  const [rtt, setRtt] = useState<number | undefined>(() => getConnection()?.rtt);
  const [forced, setForced] = useState(
    () => localStorage.getItem(SAVER_KEY) === "1",
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  useEffect(() => {
    const conn = getConnection();
    if (!conn) return;
    const onChange = () => {
      setEffectiveType(conn.effectiveType ?? "unknown");
      setRtt(conn.rtt);
    };
    conn.addEventListener("change", onChange);
    return () => conn.removeEventListener("change", onChange);
  }, []);

  const toggleDataSaver = useCallback(() => {
    setForced((prev) => {
      const next = !prev;
      localStorage.setItem(SAVER_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const slow = effectiveType === "2g" || effectiveType === "slow-2g";
  const dataSaver = forced || slow || getConnection()?.saveData === true;

  return {
    online,
    effectiveType,
    slow,
    rtt,
    dataSaver,
    dataSaverForced: forced,
    toggleDataSaver,
  };
}

// ── Image budgeting ───────────────────────────────────────────────────────────

/**
 * Downscales and re-encodes a capture before it goes anywhere.
 *
 * A modern phone camera produces 3–5MB frames. On a 2G link that is minutes of
 * upload, and crop disease detection does not need the resolution — the visual
 * signal survives 720px comfortably. Under data-saver the budget tightens
 * further.
 *
 * Returns the original untouched if anything about the re-encode fails, since
 * a slightly large upload beats a lost observation.
 */
export async function budgetImage(
  dataUri: string,
  opts: { dataSaver?: boolean } = {},
): Promise<{ image: string; originalKb: number; finalKb: number }> {
  const originalKb = Math.round((dataUri.length * 0.75) / 1024);
  const maxEdge = opts.dataSaver ? 640 : 1080;
  const quality = opts.dataSaver ? 0.55 : 0.82;

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = dataUri;
    });

    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    if (scale === 1 && !opts.dataSaver) {
      return { image: dataUri, originalKb, finalKb: originalKb };
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return { image: dataUri, originalKb, finalKb: originalKb };

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL("image/jpeg", quality);

    // Guard against the re-encode making things worse on already-small images.
    if (out.length >= dataUri.length) {
      return { image: dataUri, originalKb, finalKb: originalKb };
    }

    return {
      image: out,
      originalKb,
      finalKb: Math.round((out.length * 0.75) / 1024),
    };
  } catch {
    return { image: dataUri, originalKb, finalKb: originalKb };
  }
}
