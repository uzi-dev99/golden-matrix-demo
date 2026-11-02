'use client';

import { useEffect, useRef, useState } from 'react';

const LINKS = [{ href: '/docs', label: 'La API' }];

/** Top navigation of the hero: brand, links and the mobile menu (client side). */
export function HeroNav() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const wide = window.matchMedia('(min-width: 901px)');
    const onWide = () => setOpen(false);
    document.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      toggle.current?.focus();
    }
  }, [open]);

  return (
    <>
      <nav className="hero__nav" aria-label="Principal">
        <a className="hero__logo" href="/login">
          ASTROLABIO
        </a>
        <div className="hero__nav-end">
          <ul className="hero__links">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a className="hero__link" href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <a className="hero__cta" href="#entrar">
            Entrar
          </a>
          <button
            ref={toggle}
            type="button"
            className="hero__burger"
            aria-expanded={open}
            aria-controls="heroMenu"
            aria-label={open ? 'Cerrar el menú' : 'Abrir el menú'}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div
        id="heroMenu"
        className="hero__menu"
        data-open={open ? 'true' : 'false'}
        role="dialog"
        aria-modal="true"
        aria-label="Menú del sitio"
        aria-hidden={open ? undefined : true}
        inert={!open}
      >
        <div className="hero__menu-inner">
          {LINKS.map((link, i) => (
            <a
              key={link.href}
              className="hero__menu-link"
              style={{ '--i': i } as React.CSSProperties}
              href={link.href}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            className="hero__menu-cta"
            style={{ '--i': LINKS.length } as React.CSSProperties}
            href="#entrar"
            onClick={() => setOpen(false)}
          >
            Entrar
          </a>
        </div>
      </div>
    </>
  );
}
