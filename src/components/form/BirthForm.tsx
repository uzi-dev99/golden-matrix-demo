'use client';

import { DateTime } from 'luxon';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { patchSession } from '@/lib/session-store';
import type { BirthInput, NatalPlace } from '@/lib/types';
import { AttributionNote, LocationMap } from './LocationMap';
import { LocationSearch } from './LocationSearch';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// The zone check is local on purpose: @/lib/timezone pulls tz-lookup, which must stay out of the
// client bundle (D8). The authoritative validation is the server-side schema.
function validZone(zone: string): boolean {
  const z = zone.trim();
  if (!z) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: z });
    return true;
  } catch {
    return false;
  }
}

export function BirthForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState<NatalPlace | null>(null);
  const [timezone, setTimezone] = useState('');
  const [zoneEdited, setZoneEdited] = useState(false);

  const input: BirthInput | null = place ? { name: name.trim(), date, time, place: { ...place, timezone } } : null;
  const valid =
    !!input && input.name.length > 0 && DATE_RE.test(date) && TIME_RE.test(time) && validZone(timezone);

  const offset = useMemo(() => {
    if (!DATE_RE.test(date) || !TIME_RE.test(time) || !validZone(timezone)) return '';
    const dt = DateTime.fromISO(`${date}T${time}`, { zone: timezone });
    return dt.isValid ? dt.toFormat('ZZ') : '';
  }, [date, time, timezone]);

  async function resolveZone(latitude: number, longitude: number) {
    const res = await fetch(`/api/timezone?lat=${latitude}&lon=${longitude}`);
    if (!res.ok) return;
    const body = (await res.json().catch(() => null)) as { data?: { timezone?: string } } | null;
    if (body?.data?.timezone) setTimezone(body.data.timezone);
  }

  async function onMapChange(latitude: number, longitude: number) {
    if (!place) return;
    setPlace({ ...place, latitude, longitude });
    if (!zoneEdited) await resolveZone(latitude, longitude); // an edited zone wins over the detected one
  }

  function pickPlace(picked: NatalPlace) {
    setPlace(picked);
    setTimezone(picked.timezone);
    setZoneEdited(false);
  }

  async function restoreZone() {
    if (!place) return;
    setZoneEdited(false);
    await resolveZone(place.latitude, place.longitude);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || !input) return;
    patchSession({ input });
    router.push('/resultado');
  }

  return (
    <div>
      <p className="hint mb-4 mt-1">
        {place ? (
          <>
            Lugar elegido: <b className="text-ink">{place.label}</b> · zona <b className="text-ink">{timezone}</b>
            {offset ? `, UTC${offset} en esa fecha` : ''}.
          </>
        ) : (
          'Elige un lugar para ver el mapa y la zona horaria.'
        )}
      </p>

      <div className="grid gap-4 lg:grid-cols-[5fr_7fr]">
        <form className="panel grid content-start gap-4" onSubmit={submit} aria-label="Formulario de nacimiento" noValidate>
          <div className="field">
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" className="input" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label htmlFor="fecha">Fecha</label>
              <input id="fecha" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="hora">Hora</label>
              <input id="hora" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <LocationSearch onPick={pickPlace} />

          <div className="field">
            <label htmlFor="zona">Zona horaria</label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                id="zona"
                className="input"
                value={timezone}
                aria-describedby="hint-zona"
                onChange={(e) => {
                  setTimezone(e.target.value);
                  setZoneEdited(true);
                }}
              />
              <button type="button" className="btn btn-secondary" onClick={restoreZone} disabled={!place}>
                Restaurar
              </button>
            </div>
            <p id="hint-zona" className="hint mt-2">
              Detectada a partir del punto. Puedes corregirla; la hora de nacimiento se interpreta en esta zona.
            </p>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={!valid}>
            Calcular carta
          </button>
        </form>

        <section className="panel overflow-hidden" aria-label="Mapa">
          <div className="h-[260px] lg:h-[560px]">
            {place ? (
              <LocationMap latitude={place.latitude} longitude={place.longitude} onChange={onMapChange} />
            ) : (
              <p className="hint flex h-full items-center justify-center px-6 text-center">
                Elige un lugar para verlo en el mapa.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <span className="text-[13px]">
              <b>{place ? `${place.latitude}, ${place.longitude}` : '—'}</b>{' '}
              <span className="text-muted">· {place?.label ?? 'Sin lugar'}</span>
            </span>
            <AttributionNote />
          </div>
        </section>
      </div>
    </div>
  );
}
