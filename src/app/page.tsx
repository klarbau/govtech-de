// TODO: i18n — strings are kept inline (DE source-of-truth) for this static
// marketing landing. Localisation is intentionally out-of-scope; demo entry
// is /onboarding, not /. See `docs/design-prototype-v2/index.html` for the
// canonical mockup this file ports 1:1.

import Link from 'next/link';
import {
  Accessibility,
  ArrowRight,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Home,
  IdCard,
  Landmark,
  Lightbulb,
  Lock,
  Shield,
  Sparkles,
  User,
  Wallet,
} from 'lucide-react';

import { ParthenonCrest } from '@/components/layout/ParthenonCrest';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

// Rendered at request time: see (app)/layout.tsx — the next-intl@3 + Next 15.5
// client IntlProvider is not statically prerenderable in this setup.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      {/* Landing-only header: NOT the gt-header; no sidebar. */}
      <header className="landing-header">
        <Link href="/" className="gt-brand">
          <div className="gt-brand-logo">
            <ParthenonCrest />
            <span>GovTech DE</span>
          </div>
          <span className="gt-tagline">Verwaltung neu gedacht.</span>
        </Link>
        <nav className="landing-nav">
          <a href="#leistungen" className="menu">
            Leistungen <ChevronDown aria-hidden="true" />
          </a>
          <a href="#leistungen">Für Bürger:innen</a>
          <a href="#sicherheit">Sicherheit &amp; Datenschutz</a>
          <a href="#screens">Alle Screens</a>
        </nav>
        <ThemeToggle />
        <Link href="/onboarding" className="gt-user-pill">
          <User aria-hidden="true" />
          Anmelden
        </Link>
      </header>

      <main className="landing-page">
        <section className="hero">
          <div>
            <span className="eyebrow">
              <Sparkles aria-hidden="true" /> Die Verwaltung, die mitdenkt.
            </span>
            <h1>
              Behörden, aber
              <br />
              auf Autopilot.
            </h1>
            <p className="lede">
              Ein Bürgerportal für Deutschland, das Vorgänge vorbereitet, Daten vorausfüllt und den nächsten Schritt erklärt.
            </p>
            <div className="cta">
              <Link href="/onboarding" className="btn btn-primary btn-lg">
                Demo starten <ArrowRight aria-hidden="true" />
              </Link>
              <a href="#screens" className="btn btn-secondary btn-lg">
                Mehr erfahren <ArrowRight aria-hidden="true" />
              </a>
            </div>
            <Link href="/dashboard" className="hero-shortcut">
              Direkt zum Dashboard <ArrowRight aria-hidden="true" />
            </Link>
            <span className="trust">
              <Shield aria-hidden="true" /> Sicher. Vertrauenswürdig. Deutschlandweit.
            </span>
          </div>

          <figure role="group" aria-label="So arbeitet der Autopilot: von Ihrer Angabe bis zur Behörde" className="flow-card">
            <div className="flow-grid">
              <div className="col-head">Sie als Bürger:in</div>
              <div className="col-head" style={{ textAlign: 'center' }} />
              <div className="col-head r">Ihre Behörden</div>

              <div className="flow-col-citizen">
                <div className="flow-pill">
                  <span className="icon-circle">
                    <User aria-hidden="true" />
                  </span>
                  <div>
                    <div className="t">Einmal angeben</div>
                    <div className="s">
                      Wir verstehen Ihr Anliegen
                      <br />
                      und bereiten alles vor.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flow-auto">
                <div className="icon-square">
                  <Sparkles aria-hidden="true" />
                </div>
                <div className="name">Autopilot</div>
                <div className="desc">
                  Vorgang vorbereiten
                  <br />
                  Daten vorausfüllen
                  <br />
                  Nächsten Schritt erklären
                </div>
              </div>

              <div className="flow-col-orgs">
                <div className="flow-org">
                  <span className="icon-circle">
                    <Landmark aria-hidden="true" />
                  </span>
                  <div>
                    <div className="t">Einwohnermeldeamt</div>
                    <div className="s">Daten prüfen</div>
                  </div>
                </div>
                <div className="flow-org">
                  <span className="icon-circle">
                    <Landmark aria-hidden="true" />
                  </span>
                  <div>
                    <div className="t">Ausländerbehörde</div>
                    <div className="s">Antrag bearbeiten</div>
                  </div>
                </div>
                <div className="flow-org">
                  <span className="icon-circle">
                    <Landmark aria-hidden="true" />
                  </span>
                  <div>
                    <div className="t">Finanzamt</div>
                    <div className="s">Bescheid erhalten</div>
                  </div>
                </div>
              </div>
            </div>
            <figcaption className="flow-foot">
              <CheckCircle2 aria-hidden="true" /> Sie behalten jederzeit den Überblick und die Kontrolle.
            </figcaption>
          </figure>
        </section>

        <section className="feature-row" id="leistungen">
          <Link href="/vorgaenge/umzug/run" className="feature-card">
            <div className="body">
              <span className="icon-circle">
                <Home aria-hidden="true" />
              </span>
              <div>
                <div className="title">Umzug</div>
                <div className="sub">Wir melden Ihre neue Adresse bei allen relevanten Stellen.</div>
              </div>
            </div>
            <ChevronRight className="chev" aria-hidden="true" />
          </Link>
          <Link href="/dashboard" className="feature-card">
            <div className="body">
              <span className="icon-circle amber">
                <Lightbulb aria-hidden="true" />
              </span>
              <div>
                <div className="title">Kindergeburt</div>
                <div className="sub">Anmeldung im Rathaus, GEMA &amp; mehr – in Minuten.</div>
              </div>
            </div>
            <ChevronRight className="chev" aria-hidden="true" />
          </Link>
          <Link href="/vorgaenge" className="feature-card">
            <div className="body">
              <span className="icon-circle violet">
                <IdCard aria-hidden="true" />
              </span>
              <div>
                <div className="title">Aufenthaltstitel verlängern</div>
                <div className="sub">Antrag vorbereiten, Dokumente prüfen, Termin buchen.</div>
              </div>
            </div>
            <ChevronRight className="chev" aria-hidden="true" />
          </Link>
          <Link href="/posteingang" className="feature-card">
            <div className="body">
              <span className="icon-circle">
                <Sparkles aria-hidden="true" />
              </span>
              <div>
                <div className="title">Posteingang mit KI-Erklärer</div>
                <div className="sub">Verstehen statt verzweifeln – klärt, fasst zusammen, hilft.</div>
              </div>
            </div>
            <ChevronRight className="chev" aria-hidden="true" />
          </Link>
        </section>

        <div className="feature-row muted" id="sicherheit" style={{ marginTop: 12 }}>
          <Link href="/vorgaenge/umzug/identitaet" className="feature-card">
            <div className="body">
              <span className="icon-circle">
                <Lock aria-hidden="true" />
              </span>
              <div>
                <div className="title">DeutschlandID</div>
                <div className="sub">Sicher anmelden mit Ihrer digitalen Identität.</div>
              </div>
            </div>
            <ChevronRight className="chev" aria-hidden="true" />
          </Link>
          <Link href="/vorgaenge/umzug/identitaet" className="feature-card">
            <div className="body">
              <span className="icon-circle">
                <Wallet aria-hidden="true" />
              </span>
              <div>
                <div className="title">EUDI Wallet</div>
                <div className="sub">EU-weit anerkannt und zukunftssicher.</div>
              </div>
            </div>
            <ChevronRight className="chev" aria-hidden="true" />
          </Link>
          <div className="feature-card is-static">
            <div className="body">
              <span className="icon-circle">
                <Accessibility aria-hidden="true" />
              </span>
              <div>
                <div className="title">BITV-konform</div>
                <div className="sub">Barrierefrei, verständlich und für alle zugänglich.</div>
              </div>
            </div>
          </div>
          <div className="feature-card is-static">
            <div className="body">
              <span className="icon-circle">
                <Box aria-hidden="true" />
              </span>
              <div>
                <div className="title">Mock-Demo 2027-Vision</div>
                <div className="sub">Ein Blick in die Zukunft der Verwaltung in Deutschland.</div>
              </div>
            </div>
          </div>
        </div>

        <section className="screens-section" id="screens">
          <h2>Alle Screens dieses Konzepts</h2>
          <p className="sub">Spekulativer Demo-Prototyp · 14 Screens · Mock-Daten</p>
          <div className="screens-grid">
            <Link className="screen-link" href="/">
              <span className="n">01</span>
              <div>
                <div className="lbl">Startseite</div>
                <div className="desc">Hero · Leistungen</div>
              </div>
            </Link>
            <Link className="screen-link" href="/onboarding">
              <span className="n">02</span>
              <div>
                <div className="lbl">Anmeldung</div>
                <div className="desc">DeutschlandID · EUDI · Demo</div>
              </div>
            </Link>
            <Link className="screen-link" href="/dashboard">
              <span className="n">03</span>
              <div>
                <div className="lbl">Dashboard</div>
                <div className="desc">Heute zu tun · Übersicht</div>
              </div>
            </Link>
            <Link className="screen-link" href="/posteingang">
              <span className="n">04</span>
              <div>
                <div className="lbl">Posteingang</div>
                <div className="desc">Briefe mit KI-Erklärer</div>
              </div>
            </Link>
            <Link className="screen-link" href="/stammdaten">
              <span className="n">05</span>
              <div>
                <div className="lbl">Stammdaten</div>
                <div className="desc">Profil · Kontakt · Identität</div>
              </div>
            </Link>
            <Link className="screen-link" href="/vorgaenge">
              <span className="n">06</span>
              <div>
                <div className="lbl">Vorgänge</div>
                <div className="desc">Laufende Prozesse</div>
              </div>
            </Link>
            <Link className="screen-link" href="/dokumente">
              <span className="n">07</span>
              <div>
                <div className="lbl">Dokumente</div>
                <div className="desc">Persönlicher Ordner</div>
              </div>
            </Link>
            <Link className="screen-link" href="/termine">
              <span className="n">08</span>
              <div>
                <div className="lbl">Termine</div>
                <div className="desc">Kalender · Fristen</div>
              </div>
            </Link>
            <Link className="screen-link" href="/steuer">
              <span className="n">09</span>
              <div>
                <div className="lbl">Steuer</div>
                <div className="desc">Vorausgefüllte Erklärung</div>
              </div>
            </Link>
            <Link className="screen-link" href="/familie">
              <span className="n">10</span>
              <div>
                <div className="lbl">Familie</div>
                <div className="desc">Haushalt · Vertretungen</div>
              </div>
            </Link>
            <Link className="screen-link" href="/assistent">
              <span className="n">11</span>
              <div>
                <div className="lbl">Assistent</div>
                <div className="desc">KI-Chat mit Kontext</div>
              </div>
            </Link>
            <Link className="screen-link" href="/datenschutz">
              <span className="n">12</span>
              <div>
                <div className="lbl">Datenschutz</div>
                <div className="desc">Einwilligungen · Audit</div>
              </div>
            </Link>
            <Link className="screen-link" href="/vorgaenge/umzug/run">
              <span className="n">13</span>
              <div>
                <div className="lbl">Umzug auf Autopilot</div>
                <div className="desc">Kaskade über 5 Behörden</div>
              </div>
            </Link>
            <Link className="screen-link" href="/vorgaenge/umzug/identitaet">
              <span className="n">14</span>
              <div>
                <div className="lbl">Identität bestätigen</div>
                <div className="desc">Freigaben pro Vorgang</div>
              </div>
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="gt-brand-logo">
              <ParthenonCrest />
              <span>GovTech DE</span>
            </div>
            <p className="landing-footer-disclaimer">
              <span className="mock-tag">[MOCK]</span> Spekulativer Design-Prototyp · keine
              echte Behördenanbindung. Alle Daten sind synthetisch und dienen nur der
              Demonstration.
            </p>
          </div>
          <nav className="landing-footer-nav" aria-label="Rechtliche Hinweise">
            <a href="#sicherheit">Sicherheit &amp; Datenschutz</a>
            <a href="#leistungen">Leistungen</a>
            <a href="#screens">Alle Screens</a>
          </nav>
        </div>
        <div className="landing-footer-meta">
          <span>
            <Shield aria-hidden="true" /> Konzept im Stil von BSI-Grundschutz &amp; BITV 2.0 ·
            Datenminimierung by Design
          </span>
          <span className="landing-footer-legal">Impressum · Datenschutzerklärung (Demo)</span>
        </div>
      </footer>
    </>
  );
}
