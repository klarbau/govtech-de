import {
  Calendar,
  Euro,
  FileText,
  Folder,
  Home,
  Mail,
  MessageCircle,
  Shield,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  i18nKey:
    | 'dashboard'
    | 'posteingang'
    | 'stammdaten'
    | 'vorgaenge'
    | 'dokumente'
    | 'termine'
    | 'steuer'
    | 'familie'
    | 'assistent'
    | 'datenschutz';
  icon: LucideIcon;
}

// The 10 authenticated app routes. Single source of truth consumed by the
// top-nav „Lösungen" dropdown and the mobile drawer, so navigation stays
// reachable without a sidebar. Order/icons match the former NAV_MAIN.
export const navItems: NavItem[] = [
  { href: '/dashboard', i18nKey: 'dashboard', icon: Home },
  { href: '/posteingang', i18nKey: 'posteingang', icon: Mail },
  { href: '/stammdaten', i18nKey: 'stammdaten', icon: User },
  { href: '/vorgaenge', i18nKey: 'vorgaenge', icon: Folder },
  { href: '/dokumente', i18nKey: 'dokumente', icon: FileText },
  { href: '/termine', i18nKey: 'termine', icon: Calendar },
  { href: '/steuer', i18nKey: 'steuer', icon: Euro },
  { href: '/familie', i18nKey: 'familie', icon: Users },
  { href: '/assistent', i18nKey: 'assistent', icon: MessageCircle },
  { href: '/datenschutz', i18nKey: 'datenschutz', icon: Shield },
];
