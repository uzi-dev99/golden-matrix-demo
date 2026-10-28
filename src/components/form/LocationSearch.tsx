'use client';

import { useState } from 'react';
import type { NatalPlace } from '@/lib/types';

/** Enter runs the search; it must not submit the birth form that wraps this field. */
export function onSearchKeyDown(event: { key: string; preventDefault: () => void }, run: () => void) {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  run();
}

/** Full-query place search (no autocomplete: the Nominatim usage policy). */
export function LocationSearch({ onPick }: { onPick: (place: NatalPlace) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NatalPlace[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function search() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/places?q=${encodeURIComponent(query)}`);
      const body = (await res.json().catch(() => null)) as { data?: NatalPlace[]; error?: { message?: string } } | null;
      if (!res.ok || !body?.data) {
        setResults([]);
        setError(body?.error?.message ?? 'No se pudo buscar el lugar');
        return;
      }
      setResults(body.data);
    } catch {
      setError('No se pudo buscar el lugar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <div role="search">
        <label htmlFor="lugar">Lugar de nacimiento</label>
        <div className="flex gap-2">
          <input
            id="lugar"
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => onSearchKeyDown(e, search)}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="resultados-lugar"
            aria-describedby="hint-lugar"
            autoComplete="off"
          />
          <button type="button" className="btn btn-secondary" onClick={search} disabled={busy}>
            Buscar
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div id="resultados-lugar" role="listbox" aria-live="polite" aria-label="Resultados de la búsqueda" className="mt-2 overflow-hidden rounded-[6px] border border-control bg-surface">
          {results.map((place) => (
            <button
              key={`${place.latitude},${place.longitude}`}
              type="button"
              role="option"
              aria-selected={false}
              className="block w-full border-b border-rule px-3 py-2 text-left last:border-b-0 hover:bg-brass-soft"
              onClick={() => {
                onPick(place);
                setResults([]);
              }}
            >
              {place.label}
              <small className="block text-muted">{place.latitude}, {place.longitude}</small>
            </button>
          ))}
        </div>
      )}

      <p id="hint-lugar" className="hint mt-2">
        {error
          ? error
          : 'Escribe el lugar completo y pulsa Buscar (máximo una búsqueda por segundo). También puedes arrastrar el punto del mapa.'}
      </p>
    </div>
  );
}
