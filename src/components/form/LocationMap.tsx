'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Marker } from 'leaflet';

interface Props {
  latitude: number;
  longitude: number;
  /** Called with 6-decimal coordinates when the marker is dragged or the map is clicked. */
  onChange?: (latitude: number, longitude: number) => void;
}

const round6 = (n: number) => Number(n.toFixed(6));

/** Leaflet over standard OSM tiles. The page also shows the attribution as text (see AttributionNote). */
export function LocationMap({ latitude, longitude, onChange }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  const start = useRef({ latitude, longitude }); // the map is created once; later moves go through the effect below

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default; // Leaflet touches `window`: never import it at module level
      if (cancelled || !el.current) return;
      const m = L.map(el.current, { scrollWheelZoom: false }).setView([start.current.latitude, start.current.longitude], 11);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(m);
      // A CSS pin instead of Leaflet's default PNG icon, whose URL breaks under bundlers.
      const pin = L.divIcon({ className: '', html: '<span class="map-pin"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });
      const mk = L.marker([start.current.latitude, start.current.longitude], { icon: pin, draggable: true, keyboard: true, title: 'Arrastra para ajustar el punto' }).addTo(m);
      mk.on('dragend', () => {
        const p = mk.getLatLng();
        cb.current?.(round6(p.lat), round6(p.lng));
      });
      m.on('click', (e) => {
        mk.setLatLng(e.latlng);
        cb.current?.(round6(e.latlng.lat), round6(e.latlng.lng));
      });
      map.current = m;
      marker.current = mk;
      setTimeout(() => m.invalidateSize(), 150); // without this the map renders cropped inside a card
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    map.current?.setView([latitude, longitude]);
    marker.current?.setLatLng([latitude, longitude]);
  }, [latitude, longitude]);

  return <div ref={el} className="h-full min-h-[240px] w-full" role="application" aria-label="Mapa del lugar de nacimiento" />;
}

export function AttributionNote() {
  return (
    <p className="text-[12px] text-muted">
      Búsqueda y mapa: datos © <a className="underline" href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a> (ODbL), vía Nominatim.
    </p>
  );
}
