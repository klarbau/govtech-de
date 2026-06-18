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
  Building,
  Building2,
  Check,
  ChevronDown,
  Clock,
  Euro,
  Eye,
  FileText,
  Fingerprint,
  Home,
  IdCard,
  Landmark,
  Lock,
  Mail,
  MoreHorizontal,
  Share2,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

import { ParthenonCrest } from '@/components/layout/ParthenonCrest';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

// Rendered at request time: see (app)/layout.tsx — the next-intl@3 + Next 15.5
// client IntlProvider is not statically prerenderable in this setup.
export const dynamic = 'force-dynamic';

// Hero process-flow fan-out destinations (Brandbook §4.2 — 6 bordered chips).
const FLOW_RECIPIENTS = [
  { icon: Building, label: 'Einwohnermeldeamt' },
  { icon: FileText, label: 'Finanzamt' },
  { icon: Users, label: 'Ausländerbehörde' },
  { icon: ShieldCheck, label: 'Krankenkasse' },
  { icon: Landmark, label: 'Rentenversicherung' },
  { icon: MoreHorizontal, label: 'Weitere Stellen' },
] as const;

// Lebenslagen quick-row (Brandbook §4.3).
const LEBENSLAGEN = [
  {
    icon: Home,
    title: 'Umzug',
    desc: 'Adresse ändern und Behörden informieren – in einem Vorgang.',
    href: '/vorgaenge/umzug/run',
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
              Ein Portal. Alle Ämter. GovTech-DE bereitet Vorgänge vor, übermittelt
              Angaben sicher an zuständige Stellen und erklärt jeden nächsten Schritt
              verständlich.
            </p>
            <div className="hero-cta">
              <Link href="/onboarding" className="btn btn-primary btn-lg">
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

          {/* CENTER — signature process-flow diagram */}
          <figure
            className="flow-card"
            role="group"
            aria-label="Ablauf eines Antrags: Eine Bürgerin oder ein Bürger macht eine Angabe. GovTech-DE bereitet den Vorgang vor, prüft die Daten und bestimmt die Routen, übermittelt diese sicher und informiert sechs zuständige Stellen — Einwohnermeldeamt, Finanzamt, Ausländerbehörde, Krankenkasse, Rentenversicherung und weitere Stellen. Status und nächste Schritte bleiben jederzeit im Blick."
          >
            <p className="flow-eyebrow">Ein Antrag. Koordiniert und sicher.</p>

            <div className="flow-stage">
              {/* Node A — citizen */}
              <div className="flow-node flow-node-citizen">
                <span className="flow-node-icon">
                  <User aria-hidden="true" />
                </span>
                <div className="flow-node-text">
                  <span className="flow-node-title">Bürgerin oder Bürger</span>
                  <span className="flow-node-sub">Ein Antrag / eine Angabe</span>
                </div>
              </div>

              <span className="flow-connector" aria-hidden="true" />

              {/* Node B — GovTech-DE */}
              <div className="flow-node flow-node-gov">
                <span className="flow-node-mark">
                  <ParthenonCrest />
                </span>
                <div className="flow-node-text">
                  <span className="flow-node-title">GovTech-DE</span>
                  <span className="flow-node-sub">
                    Vorgang vorbereiten · Daten prüfen · Routen bestimmen
                  </span>
                </div>
              </div>

              <span className="flow-connector" aria-hidden="true" />

              {/* Secure hand-off hub */}
              <span className="flow-lock" aria-hidden="true">
                <Lock aria-hidden="true" />
              </span>
            </div>

            {/* Fan-out to 6 destination chips */}
            <ul className="flow-recipients">
              {FLOW_RECIPIENTS.map(({ icon: Icon, label }) => (
                <li key={label} className="flow-chip">
                  <Check className="flow-chip-check" aria-hidden="true" />
                  <Icon className="flow-chip-icon" aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>

            <figcaption className="flow-return">
              Status &amp; nächste Schritte immer im Blick
            </figcaption>
          </figure>

          {/* RIGHT — stats card */}
          <aside className="hero-stats" aria-label="Kennzahlen">
            <div className="hero-stat">
              <span className="hero-stat-icon">
                <Clock aria-hidden="true" />
              </span>
              <div className="hero-stat-body">
                <span className="hero-stat-num">8+ Std.</span>
                <span className="hero-stat-label">gespart</span>
                <span className="hero-stat-sub">
                  Durch intelligente Vorbereitung und direkte Übermittlung.
                </span>
              </div>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-icon">
                <Building2 aria-hidden="true" />
              </span>
              <div className="hero-stat-body">
                <span className="hero-stat-num">6</span>
                <span className="hero-stat-label">Behörden informiert</span>
                <span className="hero-stat-sub">
                  Automatisch die richtigen Stellen zur richtigen Zeit.
                </span>
              </div>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-icon">
                <Eye aria-hidden="true" />
              </span>
              <div className="hero-stat-body">
                <span className="hero-stat-num">24/7</span>
                <span className="hero-stat-label">im Blick</span>
                <span className="hero-stat-sub">
                  Transparenter Status und klare nächste Schritte.
                </span>
              </div>
            </div>
          </aside>
        </section>

        {/* ── Lebenslagen quick-row ─────────────────────────────────────── */}
        <section className="lebenslagen" id="leistungen" aria-labelledby="lebenslagen-title">
          <h2 id="lebenslagen-title">Lebenslagen</h2>
          <p className="section-sub">
            Starten Sie dort, wo Sie gerade stehen – wir koordinieren den Rest.
          </p>
          <div className="lebenslagen-grid">
            {LEBENSLAGEN.map(({ icon: Icon, title, desc, href }) => (
              <Link key={title} href={href} className="lebenslage-card">
                <span className="lebenslage-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="lebenslage-title">{title}</span>
                <span className="lebenslage-desc">{desc}</span>
                <ArrowRight className="lebenslage-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Trust-principles band ─────────────────────────────────────── */}
        <section className="principles" id="sicherheit" aria-labelledby="principles-title">
          <h2 id="principles-title" className="sr-only">
            Grundsätze für Vertrauen
          </h2>
          <ul className="principles-grid">
            <li className="principle">
              <span className="principle-icon">
                <Lock aria-hidden="true" />
              </span>
              <h3 className="principle-title">Private Empfänger nur mit Einwilligung</h3>
              <p className="principle-desc">
                Ihre Daten werden nur an private Stellen weitergegeben, wenn Sie zustimmen.
              </p>
            </li>
            <li className="principle">
              <span className="principle-icon">
                <ShieldCheck aria-hidden="true" />
              </span>
              <h3 className="principle-title">Sensibler Schritt nur mit eID-Bestätigung</h3>
              <p className="principle-desc">
                Für kritische Vorgänge ist Ihre Identität immer sicher und eindeutig bestätigt.
              </p>
            </li>
            <li className="principle">
              <span className="principle-icon">
                <Landmark aria-hidden="true" />
              </span>
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
