// TODO: i18n — strings are kept inline (DE source-of-truth) for this static
// marketing landing. Localisation is intentionally out-of-scope; demo entry
// is /onboarding, not /. Brandbook „Waldgrün" v1.0 (mockups #1 + #7),
// transcribed in docs/specs/brandbook-redesign.md §4.

import Link from 'next/link';
import {
  Accessibility,
  ArrowRight,
  Baby,
  Box,
  Check,
  ChevronDown,
  Euro,
  Fingerprint,
  Home,
  IdCard,
  Lock,
  Mail,
  Share2,
  ShieldCheck,
  User,
} from 'lucide-react';

import { ParthenonCrest } from '@/components/layout/ParthenonCrest';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LandingMobileNav } from '@/components/landing/LandingMobileNav';

import { LiquidGlassAux } from '@/components/layout/LiquidGlassAux';

// Rendered at request time: see (app)/layout.tsx — the next-intl@3 + Next 15.5
// client IntlProvider is not statically prerenderable in this setup.
export const dynamic = 'force-dynamic';

// Hero process-flow step-3 recipients (redesign 2026-07-09: vertical stepper,
// check-only chips — the per-Behörde icons doubled the glyph noise).
const FLOW_RECIPIENTS = [
  'Einwohnermeldeamt',
  'Finanzamt',
  'Ausländerbehörde',
  'Krankenkasse',
  'Rentenversicherung',
  'Weitere Stellen',
] as const;

// Lebenslagen quick-row (Brandbook §4.3).
const LEBENSLAGEN = [
  {
    icon: Home,
    title: 'Umzug',
    desc: 'Adresse ändern und Behörden informieren – in einem Vorgang.',
    href: '/vorgaenge/umzug/start',
  },
  {
    icon: Baby,
    title: 'Geburt',
    desc: 'Geburt registrieren und wichtige Stellen benachrichtigen.',
    href: '/dashboard',
  },
  {
    icon: IdCard,
    title: 'Aufenthaltstitel',
    desc: 'Verlängerung oder Änderung sicher beantragen.',
    href: '/vorgaenge',
  },
  {
    icon: Euro,
    title: 'Steuer',
    desc: 'Unterlagen übermitteln und Fristen im Blick behalten.',
    href: '/steuer',
  },
  {
    icon: Mail,
    title: 'Posteingang',
    desc: 'Nachrichten von Behörden sicher empfangen.',
    href: '/posteingang',
  },
] as const;

// Footer trust badges (Brandbook §4.5).
const TRUST_BADGES = [
  { icon: Fingerprint, label: 'DeutschlandID' },
  { icon: Box, label: 'EUDI Wallet' },
  { icon: Share2, label: 'FIT-Connect' },
  { icon: ShieldCheck, label: 'DSGVO-konform' },
  { icon: Accessibility, label: 'BITV-konform' },
] as const;

export default function HomePage() {
  return (
    <>
      <LiquidGlassAux />

      {/* Landing-only header: NOT the gt-header; sticky white marketing nav. */}
      <header className="landing-header">
        <Link href="/" className="gt-brand">
          <span className="gt-brand-logo">
            <ParthenonCrest />
            <span>GovTech-DE</span>
          </span>
        </Link>
        <nav className="landing-nav" aria-label="Hauptnavigation">
          <a href="#leistungen" className="menu">
            Lösungen <ChevronDown aria-hidden="true" />
          </a>
          <a href="#leistungen">Lebenslagen</a>
          <Link href="/datenschutz">Sicherheit &amp; Datenschutz</Link>
          <a href="#" className="menu">
            Ressourcen <ChevronDown aria-hidden="true" />
          </a>
          <a href="#">Über uns</a>
        </nav>
        <div className="landing-header-actions">
          <ThemeToggle />
          <Link href="/onboarding" className="btn btn-primary landing-anmelden">
            <User aria-hidden="true" />
            Anmelden
          </Link>
          <LandingMobileNav />
        </div>
      </header>

      <main className="landing-page">
        {/* ── Hero: 3-column on desktop, stacks on mobile ───────────────── */}
        <section className="hero" aria-labelledby="hero-title">
          {/* LEFT */}
          <div className="hero-intro">
            <span className="hero-pill">Ein Portal. Alle Ämter.</span>
            <h1 id="hero-title">
              Verwaltung, die
              <br />
              vorausdenkt.
            </h1>
            <p className="hero-lede">
              GovTech-DE bereitet Ihre Anfrage vor, übermittelt sie sicher an
              zuständige Stellen und erklärt jeden nächsten Schritt verständlich.
            </p>
            <div className="hero-cta">
              <Link href="/onboarding" className="btn btn-primary btn-lg lg-iridescent">
                Demo erleben <ArrowRight aria-hidden="true" />
              </Link>
              <a href="#leistungen" className="btn btn-secondary btn-lg">
                Ablauf ansehen <ArrowRight aria-hidden="true" />
              </a>
            </div>
            <p className="hero-trust">
              <ShieldCheck aria-hidden="true" />
              Sicher. Transparent. Für Sie gemacht.
            </p>
          </div>

          {/* CENTER — signature process-flow diagram: a vertical 3-step story
              (one rail, numbered steps) instead of the old horizontal chain
              whose lock + chip grid read as disconnected fragments. */}
          <figure
            className="flow-card"
            role="group"
            aria-label="Ablauf eines Antrags in drei Schritten"
          >
            <p className="flow-eyebrow">Ein Antrag. Koordiniert und sicher.</p>

            <ol className="flow-steps">
              {/* Step 1 — citizen */}
              <li className="flow-step">
                <span className="flow-step-marker" aria-hidden="true">
                  <User aria-hidden="true" />
                </span>
                <div className="flow-step-body">
                  <span className="flow-step-kicker">Schritt 1</span>
                  <span className="flow-step-title">Sie stellen einen Antrag</span>
                  <span className="flow-step-sub">
                    Ein Antrag, eine Angabe – mehr ist nicht nötig.
                  </span>
                </div>
              </li>

              {/* Step 2 — GovTech-DE coordinates + secure hand-off */}
              <li className="flow-step">
                <span
                  className="flow-step-marker flow-step-marker-gov"
                  aria-hidden="true"
                >
                  <ParthenonCrest />
                </span>
                <div className="flow-step-body">
                  <span className="flow-step-kicker">Schritt 2</span>
                  <span className="flow-step-title">GovTech-DE koordiniert</span>
                  <span className="flow-step-sub">
                    Prüft Ihre Daten und bestimmt die zuständigen Stellen.
                  </span>
                  <span className="flow-secure">
                    <Lock aria-hidden="true" />
                    Verschlüsselt übermittelt
                  </span>
                </div>
              </li>

              {/* Step 3 — recipients informed */}
              <li className="flow-step">
                <span className="flow-step-marker" aria-hidden="true">
                  <Check aria-hidden="true" />
                </span>
                <div className="flow-step-body">
                  <span className="flow-step-kicker">Schritt 3</span>
                  <span className="flow-step-title">
                    Zuständige Stellen werden informiert
                  </span>
                  <ul className="flow-recipients">
                    {FLOW_RECIPIENTS.map((label) => (
                      <li key={label} className="flow-chip">
                        <Check className="flow-chip-check" aria-hidden="true" />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            </ol>

            <figcaption className="flow-return">
              <span className="flow-return-dot" aria-hidden="true" />
              Status &amp; nächste Schritte immer im Blick
            </figcaption>
          </figure>

          {/* RIGHT — Kennzahlen: bare editorial figures (redesign 2026-07-09,
              no panel, no icon tiles — see docs/research/ai-design-tells.md) */}
          <aside className="hero-stats" aria-label="Kennzahlen">
            <div className="hero-stat">
              <p className="hero-stat-lead">
                <span className="hero-stat-num">8+ Std.</span> gespart
              </p>
              <p className="hero-stat-sub">
                Durch intelligente Vorbereitung und direkte Übermittlung.
              </p>
            </div>
            <div className="hero-stat">
              <p className="hero-stat-lead">
                <span className="hero-stat-num">6</span> Behörden informiert
              </p>
              <p className="hero-stat-sub">
                Automatisch die richtigen Stellen zur richtigen Zeit.
              </p>
            </div>
            <div className="hero-stat">
              <p className="hero-stat-lead">
                <span className="hero-stat-num">24/7</span> im Blick
              </p>
              <p className="hero-stat-sub">
                Transparenter Status und klare nächste Schritte.
              </p>
            </div>
          </aside>
        </section>

        {/* ── Lebenslagen index: editorial link rows, no card grid ──────── */}
        <section className="lebenslagen" id="leistungen" aria-labelledby="lebenslagen-title">
          <h2 id="lebenslagen-title">Lebenslagen</h2>
          <p className="section-sub">
            Starten Sie dort, wo Sie gerade stehen – wir koordinieren den Rest.
          </p>
          <ul className="lebenslagen-index">
            {LEBENSLAGEN.map(({ icon: Icon, title, desc, href }) => (
              <li key={title}>
                <Link href={href} className="lebenslage-row">
                  <span className="lebenslage-row-title">
                    <Icon aria-hidden="true" />
                    {title}
                  </span>
                  <span className="lebenslage-row-desc">{desc}</span>
                  <ArrowRight className="lebenslage-row-arrow" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Evidence: Warum DeutschlandID-first? (kommunal.de) ────────────── */}
        <section className="evidence" aria-labelledby="evidence-title">
          <div className="evidence-head">
            <h2 id="evidence-title">Warum DeutschlandID-first?</h2>
            <p className="section-sub">
              Anmeldung und Identität entscheiden, ob ein Vorgang gelingt – oder
              abgebrochen wird.
            </p>
          </div>
          <ul className="evidence-figures">
            <li className="evidence-figure">
              <span className="evidence-num">91 %</span>
              <p className="evidence-text">
                brechen in Hamburg den Vorgang ab, sobald sie im Online-Antrag auf
                die BundID-Anmeldung treffen.
              </p>
            </li>
            <li className="evidence-figure">
              <span className="evidence-num">14 von 306</span>
              <p className="evidence-text">
                bundesfinanzierten EfA-Lösungen werden flächendeckend nachgenutzt –
                rund fünf Prozent.
              </p>
            </li>
          </ul>
          <p className="evidence-source">
            Zahlen: kommunal.de. Der Deutschland-Stack ist seit 2026 in Pilotierung
            (Pilot 2026: 50–100 Kommunen, 1–2 Bundesleistungen; MVP 2028; Vollausbau
            ab 2030).
          </p>
        </section>

        {/* ── Trust-principles band ─────────────────────────────────────── */}
        <section className="principles" id="sicherheit" aria-labelledby="principles-title">
          <h2 id="principles-title" className="sr-only">
            Grundsätze für Vertrauen
          </h2>
          <ul className="principles-grid">
            <li className="principle">
              <h3 className="principle-title">Private Empfänger nur mit Einwilligung</h3>
              <p className="principle-desc">
                Ihre Daten werden nur an private Stellen weitergegeben, wenn Sie zustimmen.
              </p>
            </li>
            <li className="principle">
              <h3 className="principle-title">Sensibler Schritt nur mit eID-Bestätigung</h3>
              <p className="principle-desc">
                Für kritische Vorgänge ist Ihre Identität immer sicher und eindeutig bestätigt.
              </p>
            </li>
            <li className="principle">
              <h3 className="principle-title">Keine Daten ohne Rechtsgrundlage</h3>
              <p className="principle-desc">
                Wir verarbeiten Daten ausschließlich auf Basis gesetzlicher Grundlagen.
              </p>
            </li>
          </ul>
        </section>
      </main>

      {/* ── Footer trust bar ────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-bar">
          <p className="landing-footer-trust">
            <ShieldCheck aria-hidden="true" />
            Vertrauen durch Standards
          </p>
          <ul className="landing-footer-badges">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <li key={label} className="landing-badge">
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="landing-footer-disclaimer">
          <span className="mock-tag">[MOCK]</span> Spekulativer Design-Prototyp · keine
          echte Behördenanbindung. Alle Daten sind synthetisch und dienen ausschließlich
          der Demonstration.
        </p>
      </footer>
    </>
  );
}
