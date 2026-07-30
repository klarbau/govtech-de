import {
  Baby,
  BookMarked,
  FileText,
  Globe,
  GraduationCap,
  HeartHandshake,
  Home,
  PiggyBank,
  type LucideIcon,
} from 'lucide-react';

/** `LebenslageConfig.icon` trägt lucide-Namen in kebab-case. */
const ICONS: Record<string, LucideIcon> = {
  baby: Baby,
  'book-marked': BookMarked,
  globe: Globe,
  'graduation-cap': GraduationCap,
  'heart-handshake': HeartHandshake,
  home: Home,
  'piggy-bank': PiggyBank,
};

export function lebenslageIcon(name: string): LucideIcon {
  return ICONS[name] ?? FileText;
}

/**
 * Signet der Lebenslage: gefüllter Kreis links neben der H1 (Papier-Idiom).
 * Rein dekorativ — die H1 daneben trägt die Bedeutung.
 */
export function LebenslageBadge({ icon }: { icon: string }) {
  const Icon = lebenslageIcon(icon);
  return (
    <span className="ak-head-badge" aria-hidden="true">
      <Icon />
    </span>
  );
}
