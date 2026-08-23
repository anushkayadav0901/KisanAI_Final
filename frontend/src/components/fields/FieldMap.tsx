/**
 * FieldMap — draw a plot boundary on a real map
 *
 * Leaflet with OpenStreetMap tiles: free, no API key, no Google Maps billing.
 * Esri's world imagery layer is offered alongside, because a farmer identifies
 * their plot from what it looks like from above, not from a road map.
 *
 * Drawing is deliberately plain — tap corners, tap Finish. No drag handles, no
 * modifier keys, no right-click menus. This has to work with one thumb on a
 * cheap Android phone in a field, which rules out most drawing UX.
 *
 * Leaflet is driven imperatively here rather than through react-leaflet: the
 * interaction is a small state machine over click events, and a wrapper would
 * add a dependency and an abstraction without removing any of that logic.
 */

import React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { simpleRing, isSimple } from "../../utils/ring";

export type LngLat = [number, number];

interface Props {
  /** Points captured so far, as [lng, lat] to match GeoJSON ordering. */
  ring: LngLat[];
  onRingChange: (ring: LngLat[]) => void;
  drawing: boolean;
  /** Existing saved fields, drawn underneath in a muted style. */
  saved?: Array<{ id: string; name: string; geometry: { coordinates: number[][][] } }>;
  highlightId?: string | null;
  center?: LngLat;
}

const TILE_LAYERS = {
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagery &copy; Esri",
    maxZoom: 19,
  },
  street: {
    label: "Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
};

export const FieldMap: React.FC<Props> = ({
  ring,
  onRingChange,
  drawing,
  saved = [],
  highlightId = null,
  center = [75.857, 30.901], // Ludhiana, Punjab
}) => {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const tileRef = React.useRef<L.TileLayer | null>(null);
  const drawLayerRef = React.useRef<L.LayerGroup | null>(null);
  const savedLayerRef = React.useRef<L.LayerGroup | null>(null);

  const [basemap, setBasemap] = React.useState<keyof typeof TILE_LAYERS>("satellite");

  // Keep the latest values reachable from the click handler without
  // re-registering it on every render.
  const stateRef = React.useRef({ ring, drawing, onRingChange });
  React.useEffect(() => {
    stateRef.current = { ring, drawing, onRingChange };
  }, [ring, drawing, onRingChange]);

  // ── Init ────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!hostRef.current || mapRef.current) return;

    const map = L.map(hostRef.current, {
      center: [center[1], center[0]],
      zoom: 16,
      zoomControl: true,
      attributionControl: true,
    });

    const cfg = TILE_LAYERS.satellite;
    tileRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);

    savedLayerRef.current = L.layerGroup().addTo(map);
    drawLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const s = stateRef.current;
      if (!s.drawing) return;
      s.onRingChange([...s.ring, [e.latlng.lng, e.latlng.lat]]);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Mount once; centre changes are handled by the caller re-centring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Basemap switch ──────────────────────────────────────────────────────
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileRef.current) return;
    map.removeLayer(tileRef.current);
    const cfg = TILE_LAYERS[basemap];
    tileRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);
  }, [basemap]);

  // ── Cursor reflects mode ────────────────────────────────────────────────
  React.useEffect(() => {
    const el = mapRef.current?.getContainer();
    if (el) el.style.cursor = drawing ? "crosshair" : "";
  }, [drawing]);

  // ── Render the in-progress ring ─────────────────────────────────────────
  React.useEffect(() => {
    const layer = drawLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (ring.length === 0) return;

    // Show the shape the farmer intends: if click order self-crosses,
    // preview the corrected corner order instead of a bow-tie.
    const shown = simpleRing(ring);
    const latlngs = shown.map(([lng, lat]) => L.latLng(lat, lng));

    if (ring.length >= 3) {
      L.polygon(latlngs, {
        color: "#63A361",
        weight: 3,
        fillColor: "#63A361",
        fillOpacity: 0.25,
      }).addTo(layer);
    } else if (ring.length === 2) {
      L.polyline(latlngs, { color: "#63A361", weight: 3, dashArray: "6 6" }).addTo(layer);
    }

    // Corner markers, with the first one distinguished so it is obvious where
    // the boundary began.
    latlngs.forEach((ll, i) =>
      L.circleMarker(ll, {
        radius: i === 0 ? 7 : 5,
        color: "#FFFFFF",
        weight: 2,
        fillColor: i === 0 ? "#FFC50F" : "#63A361",
        fillOpacity: 1,
      }).addTo(layer),
    );
  }, [ring]);

  // ── Render saved fields ─────────────────────────────────────────────────
  React.useEffect(() => {
    const layer = savedLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    saved.forEach((f) => {
      const coords = f.geometry?.coordinates?.[0];
      if (!coords) return;
      const latlngs = coords.map(([lng, lat]) => L.latLng(lat, lng));
      const active = f.id === highlightId;

      L.polygon(latlngs, {
        color: active ? "#FFC50F" : "#5B532C",
        weight: active ? 3 : 2,
        fillColor: active ? "#FFC50F" : "#5B532C",
        fillOpacity: active ? 0.22 : 0.1,
      })
        .bindTooltip(f.name, { direction: "top" })
        .addTo(layer);
    });
  }, [saved, highlightId]);

  // ── Fit to the highlighted field ────────────────────────────────────────
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !highlightId) return;
    const f = saved.find((x) => x.id === highlightId);
    const coords = f?.geometry?.coordinates?.[0];
    if (!coords) return;
    map.fitBounds(
      L.latLngBounds(coords.map(([lng, lat]) => L.latLng(lat, lng))),
      { padding: [40, 40], maxZoom: 17 },
    );
  }, [highlightId, saved]);

  return (
    <div className="relative">
      <div
        ref={hostRef}
        className="w-full h-[420px] rounded-2xl overflow-hidden border border-[#5B532C]/12 z-0"
      />

      {/* Basemap toggle */}
      <div className="absolute top-3 right-3 z-[500] flex items-center gap-1 p-1 bg-white/95 backdrop-blur rounded-full shadow-lg border border-[#5B532C]/10">
        {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map((k) => (
          <button
            key={k}
            onClick={() => setBasemap(k)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              basemap === k
                ? "bg-[#63A361] text-white"
                : "text-[#5B532C]/60 hover:text-[#5B532C]"
            }`}
          >
            {TILE_LAYERS[k].label}
          </button>
        ))}
      </div>

      {drawing && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] px-4 py-2 bg-[#5B532C] text-white text-xs font-semibold rounded-full shadow-lg text-center">
          {ring.length === 0
            ? "Tap each corner of your field — go around it in one direction"
            : ring.length < 3
              ? `${ring.length} corner${ring.length === 1 ? "" : "s"} — at least 3 needed`
              : !isSimple(ring)
                ? "Corners cross — they will be re-ordered into a clean shape"
                : `${ring.length} corners — tap Finish when the shape looks right`}
        </div>
      )}
    </div>
  );
};
