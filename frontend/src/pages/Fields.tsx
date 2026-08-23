import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Pencil,
  Check,
  Undo2,
  Trash2,
  Download,
  Ruler,
  Sprout,
  Satellite,
  AlertCircle,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { FieldMap, type LngLat } from "../components/fields/FieldMap";
import { simpleRing } from "../utils/ring";
import Footer from "../components/Footer";

interface Field {
  id: string;
  name: string;
  crop: string | null;
  sownOn: string | null;
  areaHectares: number;
  centroid: [number, number];
  geometry: { type: string; coordinates: number[][][] };
  createdAt: string;
}

interface Vegetation {
  fieldId: string;
  fieldName: string;
  cadenceDays: number;
  source: { status: string; producer: string; note: string; plannedProducer: string };
  ndviSeries: Array<{ date: string; ndvi: number }>;
}

const CROPS = ["Wheat", "Rice", "Cotton", "Maize", "Sugarcane", "Mustard", "Potato", "Soybeans"];

const NdviChart: React.FC<{ series: Vegetation["ndviSeries"] }> = ({ series }) => {
  const w = 640;
  const h = 180;
  const padL = 34;
  const padB = 26;
  const padT = 10;

  const x = (i: number) => padL + (i / Math.max(series.length - 1, 1)) * (w - padL - 12);
  const y = (v: number) => padT + (1 - v) * (h - padT - padB);

  const line = series.map((p, i) => `${x(i).toFixed(1)},${y(p.ndvi).toFixed(1)}`).join(" ");
  const area = `${padL},${h - padB} ${line} ${x(series.length - 1).toFixed(1)},${h - padB}`;

  const bands = [
    { from: 0.0, to: 0.3, fill: "rgba(214,69,69,0.07)" },
    { from: 0.3, to: 0.6, fill: "rgba(255,197,15,0.09)" },
    { from: 0.6, to: 1.0, fill: "rgba(99,163,97,0.09)" },
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {bands.map((b) => (
        <rect
          key={b.from}
          x={padL}
          y={y(b.to)}
          width={w - padL - 12}
          height={y(b.from) - y(b.to)}
          fill={b.fill}
        />
      ))}

      {[0, 0.3, 0.6, 0.9].map((v) => (
        <g key={v}>
          <line
            x1={padL}
            x2={w - 12}
            y1={y(v)}
            y2={y(v)}
            stroke="rgba(91,83,44,0.12)"
            strokeDasharray="3 4"
          />
          <text x={4} y={y(v) + 4} fontSize="10" fill="rgba(91,83,44,0.45)">
            {v.toFixed(1)}
          </text>
        </g>
      ))}

      <polygon points={area} fill="rgba(99,163,97,0.16)" />
      <polyline
        points={line}
        fill="none"
        stroke="#63A361"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {series.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={y(p.ndvi)} r={3} fill="#63A361">
          <title>{`${p.date} — NDVI ${p.ndvi}`}</title>
        </circle>
      ))}

      {series.map((p, i) =>
        i % 3 === 0 || i === series.length - 1 ? (
          <text
            key={`l-${p.date}`}
            x={x(i)}
            y={h - 8}
            fontSize="9.5"
            textAnchor="middle"
            fill="rgba(91,83,44,0.45)"
          >
            {p.date.slice(5)}
          </text>
        ) : null,
      )}
    </svg>
  );
};

const Fields: React.FC = () => {
  const [fields, setFields] = React.useState<Field[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [vegetation, setVegetation] = React.useState<Vegetation | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [drawing, setDrawing] = React.useState(false);
  const [ring, setRing] = React.useState<LngLat[]>([]);
  const [naming, setNaming] = React.useState(false);
  const [name, setName] = React.useState("");
  const [crop, setCrop] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/v1/fields", { cache: "no-store" });
      if (!res.ok) throw new Error(`Fields API returned ${res.status}`);
      const data = await res.json();
      setFields(data.fields ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the fields API");
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!selected) {
      setVegetation(null);
      return;
    }
    let cancelled = false;
    fetch(`/v1/fields/${selected}/vegetation`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && setVegetation(d))
      .catch(() => !cancelled && setVegetation(null));
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const startDrawing = () => {
    setDrawing(true);
    setRing([]);
    setSelected(null);
    setNaming(false);
  };

  const cancelDrawing = () => {
    setDrawing(false);
    setRing([]);
    setNaming(false);
  };

  const save = async () => {
    try {
      const res = await fetch("/v1/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || `Field ${fields.length + 1}`,
          ring: simpleRing(ring),
          crop: crop || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message ?? String(res.status));
      }
      const field: Field = await res.json();
      toast.success(`${field.name} saved — ${field.areaHectares} hectares`, {
        duration: 3200,
      });
      setDrawing(false);
      setRing([]);
      setNaming(false);
      setName("");
      setCrop("");
      await load();
      setSelected(field.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the field");
    }
  };

  const remove = async (id: string) => {
    await fetch(`/v1/fields/${id}`, { method: "DELETE" });
    if (selected === id) setSelected(null);
    toast.success("Field removed");
    load();
  };

  const exportGeoJson = async () => {
    const res = await fetch("/v1/fields?format=geojson", { cache: "no-store" });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kisan-fields.geojson";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as GeoJSON — opens in QGIS or Earth Engine");
  };

  const totalHa = fields.reduce((a, f) => a + f.areaHectares, 0);

  return (
    <div className="relative bg-white">

      {                                                                          }
      <section className="relative pt-32 pb-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage: "radial-gradient(circle, #5B532C 1.2px, transparent 1.2px)",
              backgroundSize: "22px 22px",
            }}
          />
        </div>
        <div className="relative px-4 mx-auto max-w-6xl sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#63A361] uppercase tracking-wider">
              <MapPin className="w-4 h-4" />
              Field-level, not district-level
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-[#5B532C] leading-[1.12] mt-4 mb-4">
              Draw your{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[#63A361] px-2">field</span>
                <span className="absolute inset-0 bg-[#FDE7B3]/50 rounded-lg -rotate-1" />
              </span>
            </h1>
            <p className="text-base text-[#5B532C]/60 leading-relaxed max-w-2xl">
              Tap the corners of your plot on the map. Once a boundary exists, advisories,
              vegetation trend and irrigation timing all become specific to that field
              instead of to your district.
            </p>
          </motion.div>
        </div>
      </section>

      {error && (
        <div className="px-4 mx-auto max-w-6xl sm:px-6 lg:px-8 pb-6">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#D64545]/8 border border-[#D64545]/20">
            <AlertCircle className="w-5 h-5 text-[#B3332E] shrink-0 mt-0.5" />
            <p className="text-sm text-[#5B532C]/70">
              {error}. This page reads live from{" "}
              <code className="font-semibold">/v1/fields</code>, so the backend needs to
              be running.
            </p>
          </div>
        </div>
      )}

      {                                                                          }
      <section className="pb-16">
        <div className="px-4 mx-auto max-w-6xl sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                {!drawing ? (
                  <button
                    onClick={startDrawing}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white
                               bg-[#63A361] rounded-full hover:bg-[#4a8a4d] transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Draw a field
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setNaming(true)}
                      disabled={ring.length < 3}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white
                                 bg-[#63A361] rounded-full hover:bg-[#4a8a4d] disabled:opacity-40 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Finish ({ring.length})
                    </button>
                    <button
                      onClick={() => setRing((r) => r.slice(0, -1))}
                      disabled={ring.length === 0}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#5B532C]
                                 bg-white border-2 border-[#5B532C]/15 rounded-full disabled:opacity-40
                                 hover:border-[#63A361]/40 transition-colors"
                    >
                      <Undo2 className="w-4 h-4" />
                      Undo
                    </button>
                    <button
                      onClick={cancelDrawing}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#B3332E]
                                 bg-[#D64545]/10 rounded-full hover:bg-[#D64545]/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </>
                )}

                {fields.length > 0 && !drawing && (
                  <button
                    onClick={exportGeoJson}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#5B532C]
                               bg-white border-2 border-[#5B532C]/15 rounded-full ml-auto
                               hover:border-[#63A361]/40 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export GeoJSON
                  </button>
                )}
              </div>

              <FieldMap
                ring={ring}
                onRingChange={setRing}
                drawing={drawing && !naming}
                saved={fields}
                highlightId={selected}
              />

              {                                                   }
              <AnimatePresence>
                {naming && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-4 p-5 bg-white rounded-2xl border border-[#5B532C]/12 shadow-lg shadow-[#5B532C]/5"
                  >
                    <h3 className="text-sm font-bold text-[#5B532C] mb-3">
                      Name this field
                    </h3>
                    <div className="grid sm:grid-cols-[1fr_180px_auto] gap-3">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. North plot"
                        autoFocus
                        className="px-4 py-2.5 text-sm bg-white rounded-xl border border-[#5B532C]/15
                                   outline-none focus:border-[#63A361]/50 text-[#5B532C]"
                      />
                      <select
                        value={crop}
                        onChange={(e) => setCrop(e.target.value)}
                        className="px-4 py-2.5 text-sm bg-white rounded-xl border border-[#5B532C]/15
                                   outline-none focus:border-[#63A361]/50 text-[#5B532C]"
                      >
                        <option value="">Crop (optional)</option>
                        {CROPS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={save}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-[#63A361]
                                   rounded-xl hover:bg-[#4a8a4d] transition-colors"
                      >
                        Save field
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {                  }
            <aside>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-lg font-bold text-[#5B532C]">Your fields</h2>
                {fields.length > 0 && (
                  <span className="text-xs text-[#5B532C]/50">
                    {totalHa.toFixed(2)} ha total
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {fields.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelected(f.id === selected ? null : f.id)}
                    className={`w-full text-left p-4 bg-white rounded-2xl border transition-all ${
                      selected === f.id
                        ? "border-[#63A361]/50 shadow-lg shadow-[#63A361]/10"
                        : "border-[#5B532C]/10 hover:border-[#63A361]/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#5B532C] truncate">
                          {f.name}
                        </h3>
                        <p className="text-xs text-[#5B532C]/50 mt-1 flex items-center gap-3 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Ruler className="w-3 h-3" />
                            {f.areaHectares} ha
                          </span>
                          {f.crop && (
                            <span className="inline-flex items-center gap-1">
                              <Sprout className="w-3 h-3" />
                              {f.crop}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-[#5B532C]/35 mt-1 font-mono">
                          {f.centroid[1].toFixed(4)}, {f.centroid[0].toFixed(4)}
                        </p>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(f.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            remove(f.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-[#5B532C]/30 hover:text-[#B3332E]
                                   hover:bg-[#D64545]/8 transition-colors shrink-0 cursor-pointer"
                        title="Remove field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </span>
                    </div>
                  </button>
                ))}

                {fields.length === 0 && !error && (
                  <div className="p-6 rounded-2xl border border-dashed border-[#5B532C]/15 text-center">
                    <MapPin className="w-8 h-8 text-[#5B532C]/20 mx-auto mb-2" />
                    <p className="text-sm text-[#5B532C]/50">
                      No fields yet. Tap "Draw a field" and mark the corners of your plot.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {                                                                          }
      {vegetation && (
        <section className="py-14 bg-[#FDFCF8] border-y border-[#5B532C]/10">
          <div className="px-4 mx-auto max-w-6xl sm:px-6 lg:px-8">
            <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
              <div>
                <span className="text-xs font-semibold text-[#63A361] uppercase tracking-wider">
                  Vegetation trend
                </span>
                <h2 className="text-2xl font-bold text-[#5B532C] mt-1">
                  {vegetation.fieldName}
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFC50F]/15 text-[#A57D00] text-xs font-bold">
                <Satellite className="w-3.5 h-3.5" />
                Placeholder series
              </span>
            </div>
            <p className="text-sm text-[#5B532C]/55 mb-5">
              Every {vegetation.cadenceDays} days. Green band above 0.6 is vigorous
              growth, amber 0.3–0.6 developing, red below 0.3 bare or stressed.
            </p>

            <div className="p-5 bg-white rounded-2xl border border-[#5B532C]/10">
              <NdviChart series={vegetation.ndviSeries} />
            </div>

            <div className="flex items-start gap-4 p-5 mt-5 rounded-2xl bg-[#FDE7B3]/25 border border-[#5B532C]/10">
              <div className="w-10 h-10 rounded-xl bg-[#FFC50F]/20 flex items-center justify-center shrink-0">
                <Satellite className="w-5 h-5 text-[#A57D00]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#5B532C] mb-1">
                  This is not satellite data yet
                </h4>
                <p className="text-sm text-[#5B532C]/60 leading-relaxed">
                  {vegetation.source.note} The planned producer is{" "}
                  <strong className="text-[#5B532C]/80">
                    {vegetation.source.plannedProducer}
                  </strong>
                  . Your boundary is already stored as a GeoJSON polygon, which is what
                  Earth Engine takes as its region of interest — so connecting it
                  replaces the numbers in this chart and changes nothing else.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default Fields;
