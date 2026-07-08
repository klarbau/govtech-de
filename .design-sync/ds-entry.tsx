// Curated design-system entry for /design-sync (synth-entry mode).
// Re-exports only the presentational primitive layer of govtech-de-demo —
// the shadcn-on-base-ui primitives (src/components/ui) and the stateless
// shared primitives (src/components/shared). App-coupled feature components
// (next-intl / mock-backend / next/navigation) are deliberately excluded.
// esbuild bundles this into window.GovTechDS.*; @/ resolves via cfg.tsconfig.

// ── UI primitives (shadcn on @base-ui) ─────────────────────────────────────
export * from "@/components/ui/badge";
export * from "@/components/ui/button";
export * from "@/components/ui/card";
export * from "@/components/ui/checkbox";
export * from "@/components/ui/input";
export * from "@/components/ui/label";
export * from "@/components/ui/select";
export * from "@/components/ui/separator";
export * from "@/components/ui/switch";
export * from "@/components/ui/tabs";
export * from "@/components/ui/tooltip";
export * from "@/components/ui/sonner";

// ── Shared presentational primitives (stateless) ───────────────────────────
export * from "@/components/shared/Avatar";
export * from "@/components/shared/BehoerdenBadge";
export * from "@/components/shared/DataTable";
export * from "@/components/shared/EmptyState";
export * from "@/components/shared/FilterTabs";
export * from "@/components/shared/FristCountdown";
export * from "@/components/shared/IconCircle";
export * from "@/components/shared/KeyValueRow";
export * from "@/components/shared/ListRow";
export * from "@/components/shared/PageHeader";
export * from "@/components/shared/RightRailCard";
export * from "@/components/shared/SearchInput";
export * from "@/components/shared/SectionCard";
export * from "@/components/shared/Skeleton";
export * from "@/components/shared/StatusBadge";
export * from "@/components/shared/TerminCard";
