'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { parseISO } from 'date-fns';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Feather,
  FileText,
  Info,
  Loader2,
  Minimize2,
  Paperclip,
  ScrollText,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { api, getMockKanalForBehoerde } from '@/lib/mock-backend';
import { nachweisBezeichnungen } from '@/lib/mock-backend/reply-templates';
import {
  LETTER_ATTACHMENT_LIMITS,
  type Behoerde,
  type Letter,
  type Reply,
  type ReplyDraft,
  type ReplyTemplateId,
  type ReplyTerminMode,
} from '@/types';

import { BekanntgabeCaveatDetails } from './BekanntgabeCaveatDetails';
import { FristAbgelaufenWarnung } from './FristAbgelaufenWarnung';
import { FristCitedFormatHeader } from './FristCitedFormatHeader';
import { PreInsertionModal } from './PreInsertionModal';
import { PreVersandModal } from './PreVersandModal';
import { ReplyConfirmationView } from './ReplyConfirmationView';
import { ReplyDiscardConfirmDialog } from './ReplyDiscardConfirmDialog';
import { ReplyTemplateSwitchConfirmDialog } from './ReplyTemplateSwitchConfirmDialog';
import {
  getReplyTemplatePickerOrder,
  isCompanionSkelettSwitch,
  isSkelettTemplate,
  type ReplyTemplateChoice,
} from './preInsertionModalLookup';

/** Stable className constants — previously the Sheet{Header,Body,Footer} slots. */
const composeHeaderClass = 'flex flex-col gap-1 border-b border-border px-5 py-4';
const composeBodyClass =
  'flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4';
const composeFooterClass =
  'flex flex-col gap-2 border-t border-border bg-surface-muted/40 px-5 py-4';

/**
 * Render-slot shell. `ReplyComposeContent` builds the inner chrome
 * (header + body + footer) and hands it to the active wrapper. The wrapper
 * (inline `<section>` or modal `<Sheet>`) supplies the surrounding container so
 * the same stable `ReplyComposeContent` subtree survives an inline↔modal flip
 * (Spec §6.4 render-slot variant).
 */
export type ComposeShellRenderer = (chrome: React.ReactNode) => React.ReactNode;

interface ReplyComposeContentProps {
  /** `'inline'` renders a non-modal heading + entrance stagger; `'modal'` the Sheet title. */
  variant: 'inline' | 'modal';
  letter: Letter;
  empfaengerBehoerde: Behoerde | null;
  /** Optional: gesendete Reply, falls vorhanden — öffnet im Read-only-Confirmation-Mode. */
  existingReply: Reply | null;
  /** Wird nach Versand / Save gerufen, damit der Aufrufer Briefdaten neu lädt. */
  onPersisted?: () => void;
  /** Schließt den Compose-Bereich (mappt auf das frühere `onOpenChange(false)`). */
  onRequestClose: () => void;
  /** Inline-Wrapper setzt damit den Fokus aufs Heading; Modal ignoriert es. */
  headingRef?: React.Ref<HTMLHeadingElement>;
  /**
   * Meldet, ob ein nested-Modal (PreInsertion/PreVersand/Discard/TemplateSwitch)
   * offen ist — der Inline-Wrapper unterdrückt damit sein Panel-Escape (§6.3).
   */
  onNestedModalOpenChange?: (anyOpen: boolean) => void;
  /** Wrapper, der das Compose-Chrome umhüllt (Render-Slot, §6.4). */
  renderShell: ComposeShellRenderer;
}

interface FormState {
  template: ReplyTemplateChoice;
  mode: ReplyTerminMode | null;
  body: string;
  attachments: File[];
  /** persistierte Mock-Anhänge (nur Metadaten). */
  persistedAttachments: ReplyDraft['attachments'];
  /** Controlled-list-Auswahl für `nachweis_einreichen`. */
  nachweisBezeichnung: string | null;
}

interface AttachmentError {
  type: 'too-many' | 'too-large-file' | 'too-large-total' | 'mime';
  fileName?: string;
}

function bytesToMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

function relTimeAgo(date: Date, now: Date): { kind: 'now' | 'sec' | 'min'; n: number } {
  const ms = now.getTime() - date.getTime();
  if (ms < 4_000) return { kind: 'now', n: 0 };
  if (ms < 60_000) return { kind: 'sec', n: Math.floor(ms / 1000) };
  return { kind: 'min', n: Math.max(1, Math.floor(ms / 60_000)) };
}

/** Aktionen der KI-Umformulieren-Chips (Spec §4.1). */
type ReplyRewriteAction = 'umformulieren' | 'kuerzer' | 'formeller' | 'einfacher';

interface ReplyRewriteResponse {
  body: string;
  source: 'ai' | 'fallback';
}

/**
 * Wrapper-agnostischer Compose-Innenkörper (Spec V1.5 §4.3 + V1.5.1 §§ 6–9),
 * extrahiert aus dem früheren `ReplySheet`. Die Reply-Business-Logik (Templates,
 * Skelett-Routing, RDG-Gate, cross-send-Automat, Autosave) ist unverändert; nur
 * die Hülle ist austauschbar (§5: inline `<section>` vs. modaler `<Sheet>`).
 *
 * Render-Reihenfolge im Body (V1.5.1 § 9.1):
 *   1. Outbound-Speculative-Banner (V1.5.0)
 *   2. FristAbgelaufenWarnung (conditional)
 *   3. FristCitedFormatHeader (conditional, Skelett-Templates only)
 *   4. BekanntgabeCaveatDetails (conditional, mein-elster only)
 *   5. ReplyTemplatePicker (mit V1.5.1-Order)
 *   6. Termin-Mode-Radios | Nachweis-Select | Body-Textarea | Anhänge
 *   7. Skelett-Footer-No-Legal-Advice-Hint (conditional)
 */
export function ReplyComposeContent({
  variant,
  letter,
  empfaengerBehoerde,
  existingReply,
  onPersisted,
  onRequestClose,
  headingRef,
  onNestedModalOpenChange,
  renderShell,
}: ReplyComposeContentProps) {
  const t = useTranslations('posteingang.compose');
  const tTemplates = useTranslations('posteingang.compose.templates');
  const tPicker = useTranslations('posteingang.compose.template_picker');
  // Phase 6b — neuer i18n-Tree für Skelett-Banner (`posteingang.reply.*`).
  const tReply = useTranslations('posteingang.reply');

  const reduceMotion = useReducedMotion();
  const isInline = variant === 'inline';

  const [formState, setFormState] = React.useState<FormState>({
    template: 'freitext',
    mode: null,
    body: '',
    attachments: [],
    persistedAttachments: [],
    nachweisBezeichnung: null,
  });
  /**
   * Visual-only Default-Highlight für `pickerOrder[0]`, wenn dieses ein
   * Skelett-Template ist (Hard-Line § 11.13). Der zugehörige Radio-Input ist
   * NICHT `checked` — das Body-Feld bleibt leer, bis User klickt und der
   * Pre-Insertion-Modal bestätigt wird. Wir trennen "empfohlen" vom
   * "ausgewählt"-State, damit `onChange` auf dem ersten Klick feuert.
   */
  const [recommendedTemplate, setRecommendedTemplate] =
    React.useState<ReplyTemplateId | null>(null);
  const [draftId, setDraftId] = React.useState<string | null>(null);
  const [draftCreatedAt, setDraftCreatedAt] = React.useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const [savingState, setSavingState] = React.useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [versandModalOpen, setVersandModalOpen] = React.useState(false);
  const [versandPending, setVersandPending] = React.useState(false);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [templateSwitchTarget, setTemplateSwitchTarget] =
    React.useState<ReplyTemplateChoice | null>(null);
  const [preInsertionTarget, setPreInsertionTarget] =
    React.useState<ReplyTemplateId | null>(null);
  const [crossSendStage, setCrossSendStage] = React.useState<
    'idle' | 'reply1-pending' | 'reply2-prep' | 'reply2-pending' | 'done'
  >('idle');
  const [crossSendAnnouncement, setCrossSendAnnouncement] =
    React.useState<string>('');
  const [attachmentErrors, setAttachmentErrors] = React.useState<AttachmentError[]>(
    [],
  );
  const [personaId, setPersonaId] = React.useState<string | null>(null);
  const [templatePending, setTemplatePending] = React.useState(false);
  const [rewritePending, setRewritePending] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState<Reply | null>(
    existingReply,
  );
  /**
   * Vollständige Reply-Liste für den aktuellen Letter, chronologisch
   * aufsteigend (Spec § 8.3 step 5). Single-Reply-Pfad: Länge 1.
   * Cross-Template-Versand-Pfad: Länge 2 (Einspruch + Aussetzung).
   */
  const [replies, setReplies] = React.useState<Reply[]>(
    existingReply ? [existingReply] : [],
  );
  const [readOnlyReply, setReadOnlyReply] = React.useState<Reply | null>(null);

  const pickerOrder = React.useMemo(
    () => getReplyTemplatePickerOrder(letter),
    [letter],
  );

  // M2-Stagger nur beim ERSTEN Öffnen pro Letter (Spec §7 M2) und nur inline.
  const staggeredLettersRef = React.useRef<Set<string>>(new Set());
  const [runStagger, setRunStagger] = React.useState(false);
  React.useEffect(() => {
    if (!isInline || confirmation) {
      setRunStagger(false);
      return;
    }
    if (staggeredLettersRef.current.has(letter.id)) {
      setRunStagger(false);
      return;
    }
    staggeredLettersRef.current.add(letter.id);
    setRunStagger(true);
  }, [isInline, confirmation, letter.id]);

  // Nested-Modal-Status nach oben melden (Inline-Escape-Guard, §6.3).
  const anyNestedModalOpen =
    versandModalOpen ||
    discardOpen ||
    templateSwitchTarget !== null ||
    preInsertionTarget !== null;
  React.useEffect(() => {
    onNestedModalOpenChange?.(anyNestedModalOpen);
  }, [anyNestedModalOpen, onNestedModalOpenChange]);

  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!lastSavedAt) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [lastSavedAt]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await api.getProfile();
        if (cancelled) return;
        setPersonaId(profile.id);
      } catch {
        // resolver throws PERSONA_NOT_FOUND on first reply if needed
      }
      try {
        const list = await api.getRepliesForLetter(letter.id);
        if (cancelled) return;
        const sentList = list.filter((r) => r.status === 'sent_simulated');
        if (sentList.length > 0) {
          setReplies(sentList);
          setConfirmation(sentList[sentList.length - 1] ?? null);
          return;
        }
      } catch {
        // fall through to draft lookup
      }
      try {
        const draft = await api.getReplyDraft(letter.id);
        if (cancelled) return;
        if (draft) {
          const tpl: ReplyTemplateChoice = draft.template_id ?? 'freitext';
          setFormState({
            template: tpl,
            mode: draft.mode ?? null,
            body: draft.body_de,
            attachments: [],
            persistedAttachments: draft.attachments,
            nachweisBezeichnung: null,
          });
          setDraftId(draft.id);
          setDraftCreatedAt(draft.created_at);
          setLastSavedAt(parseISO(draft.updated_at));
          setSavingState('saved');
        } else {
          // Default-Highlight = pickerOrder[0] (Spec § 6.3); aber nur wenn
          // kein Draft existiert. Skelett-Templates triggern den Modal nicht
          // automatisch — User muss explizit klicken (Hard-Line § 11.13).
          //
          // Wenn pickerOrder[0] ein Skelett ist: NICHT in formState.template
          // schreiben, sonst wäre der Radio bereits `checked` und der erste
          // Klick würde keinen `onChange` feuern → Pre-Insertion-Modal käme
          // nie. Stattdessen visueller Highlight via `recommendedTemplate`.
          const initial = pickerOrder[0] ?? 'freitext';
          if (isSkelettTemplate(initial)) {
            setRecommendedTemplate(initial);
            setFormState((s) => ({ ...s, template: 'freitext' }));
          } else {
            setRecommendedTemplate(null);
            setFormState((s) => ({ ...s, template: initial }));
          }
        }
      } catch {
        // no persisted draft
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [letter.id, pickerOrder]);

  const lastSaveRef = React.useRef<{
    body: string;
    template: ReplyTemplateChoice;
    mode: ReplyTerminMode | null;
  }>({ body: '', template: 'freitext', mode: null });
  React.useEffect(() => {
    if (confirmation) return;
    if (
      formState.body === lastSaveRef.current.body &&
      formState.template === lastSaveRef.current.template &&
      formState.mode === lastSaveRef.current.mode &&
      formState.attachments.length === 0
    ) {
      return;
    }
    if (
      formState.body.trim().length === 0 &&
      formState.persistedAttachments.length === 0 &&
      formState.attachments.length === 0
    ) {
      return;
    }
    const handle = window.setTimeout(() => {
      void persistDraft();
    }, 2000);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formState.body,
    formState.template,
    formState.mode,
    formState.attachments.length,
    confirmation,
  ]);

  async function persistDraft(): Promise<ReplyDraft | null> {
    setSavingState('saving');
    const newAttachments = await Promise.all(
      formState.attachments.map(async (file) => ({
        name: file.name,
        mime: file.type,
        size_bytes: file.size,
        '[MOCK]_data': `[MOCK] data:${file.type};name=${encodeURIComponent(file.name)}`,
      })),
    );
    const allAttachments = [
      ...formState.persistedAttachments,
      ...newAttachments,
    ];
    try {
      const saved = await api.saveReplyDraft(letter.id, {
        template_id:
          formState.template === 'freitext' ? null : formState.template,
        mode:
          formState.template === 'termin_antwort' && formState.mode
            ? formState.mode
            : undefined,
        body_de: formState.body,
        attachments: allAttachments,
      });
      setDraftId(saved.id);
      setDraftCreatedAt(saved.created_at);
      setLastSavedAt(new Date());
      setSavingState('saved');
      lastSaveRef.current = {
        body: formState.body,
        template: formState.template,
        mode: formState.mode,
      };
      setFormState((s) => ({
        ...s,
        attachments: [],
        persistedAttachments: saved.attachments,
      }));
      return saved;
    } catch {
      setSavingState('error');
      return null;
    }
  }

  async function loadTemplateBody(
    next: ReplyTemplateChoice,
    modeNext: ReplyTerminMode | null,
    nachweisNext: string | null,
  ) {
    // Sobald ein echter Template-Wechsel passiert, ist die initiale
    // Skelett-Empfehlung obsolet — sonst doppelter Highlight (recommended +
    // checked auf demselben Item bzw. zweier Items).
    setRecommendedTemplate(null);
    if (next === 'freitext') {
      setFormState((s) => ({
        ...s,
        template: 'freitext',
        mode: null,
        body: '',
      }));
      return;
    }
    if (!personaId) {
      setFormState((s) => ({
        ...s,
        template: next,
        mode: next === 'termin_antwort' ? (modeNext ?? 'bestaetigen') : null,
        nachweisBezeichnung:
          next === 'nachweis_einreichen' ? nachweisNext : null,
      }));
      return;
    }
    setTemplatePending(true);
    try {
      const resolved = await api.resolveReplyBody({
        personaId,
        letterId: letter.id,
        templateId: next,
        ...(next === 'termin_antwort' && modeNext ? { mode: modeNext } : {}),
        ...(next === 'nachweis_einreichen' && nachweisNext
          ? { userInput: { nachweis_bezeichnung: nachweisNext } }
          : {}),
      });
      setFormState((s) => ({
        ...s,
        template: next,
        mode: next === 'termin_antwort' ? (modeNext ?? 'bestaetigen') : null,
        nachweisBezeichnung:
          next === 'nachweis_einreichen' ? nachweisNext : null,
        body: resolved,
      }));
    } catch {
      toast.error(t('send_error_toast'));
    } finally {
      setTemplatePending(false);
    }
  }

  function performTemplateSwitch(next: ReplyTemplateChoice) {
    if (next === 'termin_antwort') {
      void loadTemplateBody(next, formState.mode ?? 'bestaetigen', null);
    } else if (next === 'nachweis_einreichen') {
      void loadTemplateBody(next, null, formState.nachweisBezeichnung);
    } else {
      void loadTemplateBody(next, null, null);
    }
  }

  /**
   * Klick auf einen Picker-Radio.
   *
   * Routing:
   *   - Skelett-Template + leerer Body → öffne PreInsertionModal direkt.
   *   - Skelett-Template + nicht-leerer Body + companion-Skelett-Vorlage
   *     im Draft → öffne 3-Button-Switch-Dialog.
   *   - Skelett-Template + nicht-leerer Body sonst → 2-Button-Switch-Dialog;
   *     bei Bestätigung wird PreInsertionModal aufgesetzt.
   *   - Non-Skelett-Template + leerer Body → direkter Switch.
   *   - Non-Skelett-Template + nicht-leerer Body → 2-Button-Switch-Dialog.
   */
  function onTemplateClick(next: ReplyTemplateChoice) {
    if (formState.template === next) {
      // Click auf bereits ausgewähltes Template: nur No-Op, AUSSER es ist
      // freitext und es gibt noch eine offene Skelett-Empfehlung — dann
      // nimmt der User die Empfehlung explizit an: Recommendation löschen.
      if (next === 'freitext' && recommendedTemplate !== null) {
        setRecommendedTemplate(null);
      }
      return;
    }
    const hasBody = formState.body.trim().length > 0;
    const targetIsSkelett = isSkelettTemplate(next);

    if (!hasBody) {
      if (targetIsSkelett) {
        setPreInsertionTarget(next as ReplyTemplateId);
        return;
      }
      performTemplateSwitch(next);
      return;
    }

    setTemplateSwitchTarget(next);
  }

  function onModeChange(nextMode: ReplyTerminMode) {
    if (formState.template !== 'termin_antwort') return;
    void loadTemplateBody('termin_antwort', nextMode, null);
  }

  function onNachweisChange(value: string | null) {
    if (formState.template !== 'nachweis_einreichen') return;
    if (!value) return;
    void loadTemplateBody('nachweis_einreichen', null, value);
  }

  function validateNewFiles(files: File[]): {
    valid: File[];
    errors: AttachmentError[];
  } {
    const errors: AttachmentError[] = [];
    const existing =
      formState.persistedAttachments.reduce(
        (acc, a) => acc + a.size_bytes,
        0,
      ) +
      formState.attachments.reduce((acc, f) => acc + f.size, 0);
    const totalCount =
      formState.persistedAttachments.length + formState.attachments.length;
    let runningTotal = existing;
    let runningCount = totalCount;
    const valid: File[] = [];
    for (const f of files) {
      if (runningCount >= LETTER_ATTACHMENT_LIMITS.MAX_FILES) {
        errors.push({ type: 'too-many' });
        continue;
      }
      if (
        !(LETTER_ATTACHMENT_LIMITS.ALLOWED_MIME as readonly string[]).includes(
          f.type,
        )
      ) {
        errors.push({ type: 'mime', fileName: f.name });
        continue;
      }
      if (f.size > LETTER_ATTACHMENT_LIMITS.MAX_BYTES_PER_FILE) {
        errors.push({ type: 'too-large-file', fileName: f.name });
        continue;
      }
      if (
        runningTotal + f.size >
        LETTER_ATTACHMENT_LIMITS.MAX_BYTES_TOTAL
      ) {
        errors.push({ type: 'too-large-total' });
        continue;
      }
      valid.push(f);
      runningTotal += f.size;
      runningCount += 1;
    }
    return { valid, errors };
  }

  function ingestFiles(files: File[]) {
    if (files.length === 0) return;
    const { valid, errors } = validateNewFiles(files);
    setAttachmentErrors(errors);
    if (valid.length > 0) {
      setFormState((s) => ({ ...s, attachments: [...s.attachments, ...valid] }));
    }
  }

  function onAttachmentSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    ingestFiles(files);
  }

  function removePersistedAttachment(index: number) {
    setFormState((s) => ({
      ...s,
      persistedAttachments: s.persistedAttachments.filter((_, i) => i !== index),
    }));
  }
  function removeStagedAttachment(index: number) {
    setFormState((s) => ({
      ...s,
      attachments: s.attachments.filter((_, i) => i !== index),
    }));
  }

  async function onSendConfirm() {
    setVersandPending(true);
    try {
      const persisted = await persistDraft();
      const draft: ReplyDraft = {
        id: persisted?.id ?? draftId ?? `reply-pending-${letter.id}`,
        letter_id: letter.id,
        status: 'draft',
        template_id:
          formState.template === 'freitext' ? null : formState.template,
        body_de: formState.body,
        attachments: persisted?.attachments ?? formState.persistedAttachments,
        ...(formState.template === 'termin_antwort' && formState.mode
          ? { mode: formState.mode }
          : {}),
        created_at: draftCreatedAt ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sent_at: null,
        kanal: null,
      };
      const sent = await api.sendReplySimulated(letter.id, draft);

      if (crossSendStage === 'reply1-pending') {
        // Cross-Template-Versand-Pfad (Spec § 8.3): Reply 1 ist gesendet,
        // jetzt re-hydratisieren mit dem companion-Skelett-Template.
        setVersandModalOpen(false);
        setVersandPending(false);
        const companionId: ReplyTemplateId =
          sent.template_id === 'rechtsbehelf_einspruch_skelett'
            ? 'aussetzung_vollziehung_skelett'
            : 'rechtsbehelf_einspruch_skelett';
        setCrossSendStage('reply2-prep');
        setCrossSendAnnouncement(t('cross_send.reply1_sent_announcement'));
        // Form zurücksetzen, draft ID frei für Reply 2
        setFormState((s) => ({
          ...s,
          template: 'freitext',
          mode: null,
          body: '',
        }));
        setDraftId(null);
        setDraftCreatedAt(null);
        setLastSavedAt(null);
        setSavingState('idle');
        // Trigger Pre-Insertion-Modal für Reply 2 — damit User die Norm-
        // Familie für AdV bestätigt (Hard-Line § 11.13).
        setPreInsertionTarget(companionId);
        onPersisted?.();
        return;
      }

      if (crossSendStage === 'reply2-pending') {
        setCrossSendStage('done');
      }
      setConfirmation(sent);
      // Cross-Template-Versand-Pfad (Spec § 8.3 step 5): nach Reply 2
      // bzw. nach jedem Single-Send die volle Liste laden, damit
      // <ReplyConfirmationView> alle Replies stapelt.
      try {
        const list = await api.getRepliesForLetter(letter.id);
        const sentList = list.filter((r) => r.status === 'sent_simulated');
        setReplies(sentList.length > 0 ? sentList : [sent]);
      } catch {
        setReplies([sent]);
      }
      setVersandModalOpen(false);
      onPersisted?.();
    } catch {
      toast.error(t('send_error_toast'));
      setVersandModalOpen(false);
    } finally {
      setVersandPending(false);
    }
  }

  async function onDiscardConfirm() {
    try {
      await api.deleteReplyDraft(letter.id);
    } catch {
      // best-effort
    }
    setDiscardOpen(false);
    onRequestClose();
    onPersisted?.();
  }

  /** Cross-Template-Versand starten — Spec § 8.3. */
  function onDualSend() {
    // Bei Klick „Beide als getrennte Briefe versenden": versende den aktuellen
    // Draft (Reply 1) zuerst; nach Erfolg re-hydratisiert `onSendConfirm` das
    // Compose-Panel mit dem companion-Template (Reply 2).
    if (templateSwitchTarget) {
      // Companion-Switch wird nach Versand 1 in `onSendConfirm` für Reply 2
      // aufgesetzt; Reply 1 behält das aktuelle Template.
      setTemplateSwitchTarget(null);
    }
    setCrossSendStage('reply1-pending');
    setVersandModalOpen(true);
  }

  const empfaengerName = empfaengerBehoerde?.name_de ?? letter.absender_behoerde_id;
  const kanalHeute = empfaengerBehoerde
    ? getMockKanalForBehoerde(empfaengerBehoerde.id)
    : '—';

  const placeholderKey = formState.template;
  const placeholder = (() => {
    try {
      return t(`body_textarea_placeholder.${placeholderKey}`);
    } catch {
      return '';
    }
  })();

  const totalAttachmentCount =
    formState.persistedAttachments.length + formState.attachments.length;

  const draftSavedRel = (() => {
    if (savingState === 'saving') return t('draft_saving');
    if (savingState === 'error') return t('draft_save_error');
    if (!lastSavedAt) return null;
    const r = relTimeAgo(lastSavedAt, new Date());
    if (r.kind === 'now') return t('draft_just_now');
    return t('draft_saved_template', {
      n: r.kind === 'sec' ? r.n : r.n * 60,
    });
  })();

  // Switch-Dialog 3-Button-Mode prüfen (Spec § 8.1).
  const switchDualMode =
    templateSwitchTarget !== null &&
    isCompanionSkelettSwitch(formState.template, templateSwitchTarget);

  const currentIsSkelett = isSkelettTemplate(formState.template);

  /**
   * Template, dessen Frist-Kontext (FristAbgelaufenWarnung + FristCitedFormat-
   * Header) angezeigt wird. Solange ein Skelett nur *empfohlen* ist (Radio noch
   * nicht aktiv, Body leer — recommended-vs-checked-Split), bleibt
   * `formState.template` auf `'freitext'`; der Frist-Hinweis soll aber bereits
   * beim Öffnen sichtbar sein (§ 9.2). Sobald die Nutzerin bewusst wählt, gilt
   * wieder `formState.template`.
   */
  const contextTemplate: ReplyTemplateChoice =
    formState.template === 'freitext' && recommendedTemplate
      ? recommendedTemplate
      : formState.template;

  // Inline-Disclaimer-Render (V1.5.0-Verhalten erhalten + V1.5.1 Skelett-Footer).
  const disclaimerInline = (() => {
    if (formState.template === 'freitext') return null;
    try {
      return tTemplates(`${formState.template}.disclaimer_inline`);
    } catch {
      return null;
    }
  })();
  const skelettFooter = (() => {
    if (!currentIsSkelett) return null;
    try {
      return t('skelett_footer_no_legal_advice');
    } catch {
      return null;
    }
  })();

  const headingText = confirmation
    ? t('confirmation.headline')
    : t('sheet_title', { behoerde: empfaengerName });

  // M2-Stagger-Helper für die vier nummerierten Blöcke (nur inline + erstes
  // Öffnen + kein reduced-motion). Liefert framer-motion-Props; sonst leer.
  const staggerOrderRef = React.useRef(0);
  function staggerProps(): Record<string, unknown> {
    if (!isInline || !runStagger || reduceMotion) return {};
    const index = staggerOrderRef.current;
    staggerOrderRef.current += 1;
    return {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.2, ease: 'easeOut', delay: index * 0.05 },
    };
  }
  // Reset der Stagger-Reihenfolge bei jedem Render (Blöcke fragen in DOM-Folge).
  staggerOrderRef.current = 0;

  const headerNode = (
    <div className={composeHeaderClass}>
      {variant === 'modal' ? (
        // Modal: echter DialogPrimitive.Title (über SheetTitle), damit der
        // geprüfte base-ui-Dialog-A11y-Vertrag erhalten bleibt; trägt dieselbe
        // id wie `aria-labelledby` auf dem Popup.
        <SheetTitle
          id="reply-compose-heading"
          ref={headingRef}
          tabIndex={-1}
          className="outline-none"
        >
          {headingText}
        </SheetTitle>
      ) : (
        // Inline: nicht-modaler <h2>, fokussierbar für die Öffnen-Fokus-Übergabe.
        <h2
          id="reply-compose-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold text-text-primary outline-none"
        >
          {headingText}
        </h2>
      )}
      <div className="flex flex-col gap-0.5 text-xs text-text-muted">
        <p>{t('recipient_label_template', { behoerde: empfaengerName })}</p>
        <p>{t('betreff_label_template', { betreff: letter.betreff })}</p>
        <p className="flex flex-wrap items-center gap-1">
          <span>
            {t('aktenzeichen_label_template', { aktenzeichen: '' }).replace(
              /\s*$/,
              '',
            )}
          </span>
          <span className="rounded bg-surface-muted px-1 font-mono text-[10px] uppercase tracking-wide text-text-muted">
            [MOCK]
          </span>
          <span className="font-mono tabular-nums text-text-primary">
            {letter.aktenzeichen}
          </span>
        </p>
      </div>
    </div>
  );

  const bodyNode = confirmation ? (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key="confirmation"
        className={composeBodyClass}
        {...(isInline && !reduceMotion
          ? {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.22, ease: 'easeOut' },
            }
          : {})}
      >
        {readOnlyReply ? (
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReadOnlyReply(null)}
              className="self-start"
            >
              <X className="size-4" aria-hidden="true" />
              {t('confirmation.headline')}
            </Button>
            <h3 className="text-sm font-semibold">
              {t('confirmation.body_heading')}
            </h3>
            <pre
              dir="ltr"
              lang="de"
              className="whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 font-sans text-xs leading-relaxed"
            >
              {readOnlyReply.body_de}
            </pre>
          </div>
        ) : (
          <ReplyConfirmationView
            replies={replies.length > 0 ? replies : [confirmation]}
            letterId={letter.id}
            empfaengerBehoerde={empfaengerName}
            kanalHeute={kanalHeute}
            onClose={onRequestClose}
            onViewSubmittedBody={(r) => setReadOnlyReply(r)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  ) : (
    <div className={composeBodyClass}>
      <SpeculativeBanner empfaenger={empfaengerName} />

      {/* Frist-Kontext (Warnung + zitierter Frist-Header) gilt dem
          Skelett, das der Picker empfiehlt — auch solange dessen Radio
          noch nicht aktiv gewählt ist (recommended-vs-checked-Split, §
          9.2). Sonst bliebe der § -Frist-Hinweis bis zum ersten Klick
          unsichtbar, obwohl er die wichtigste Information beim Öffnen
          ist. Body/Radio bleiben unberührt (Hard-Line § 11.13). */}
      <FristAbgelaufenWarnung letter={letter} templateId={contextTemplate} />

      <FristCitedFormatHeader letter={letter} templateId={contextTemplate} />

      <BekanntgabeCaveatDetails letter={letter} />

      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        data-testid="cross-send-announcement"
      >
        {crossSendAnnouncement}
      </div>

      <motion.fieldset className="flex flex-col gap-2" {...staggerProps()}>
        <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {tPicker('legend')}
        </legend>
        <div
          role="radiogroup"
          aria-labelledby="template-picker-title"
          className="grid gap-2 sm:grid-cols-1"
          onKeyDown={(event) => {
            if (
              event.key !== 'ArrowDown' &&
              event.key !== 'ArrowRight' &&
              event.key !== 'ArrowUp' &&
              event.key !== 'ArrowLeft'
            ) {
              return;
            }
            event.preventDefault();
            const current = pickerOrder.indexOf(formState.template);
            const base = current < 0 ? 0 : current;
            const delta =
              event.key === 'ArrowDown' || event.key === 'ArrowRight'
                ? 1
                : -1;
            const nextIndex =
              (base + delta + pickerOrder.length) % pickerOrder.length;
            const nextId = pickerOrder[nextIndex];
            if (nextId) onTemplateClick(nextId);
          }}
        >
          {pickerOrder.map((id) => {
            // Solange eine Skelett-Empfehlung vorliegt (= User hat
            // noch keine bewusste Wahl getroffen), wird KEIN Radio
            // als "ausgewählt" gerendert — sonst doppelter
            // Highlight (recommended + checked auf zwei Zeilen).
            const isRecommendationActive = recommendedTemplate !== null;
            const checked =
              !isRecommendationActive && formState.template === id;
            const recommended = recommendedTemplate === id;
            const highlighted = checked || recommended;
            const labelKey = `${id}.label`;
            const descKey = `${id}.description`;
            const iconKey = `${id}.icon`;
            // Defensive lookup — i18n-localizer arbeitet parallel.
            const label = (() => {
              try {
                return tPicker(labelKey);
              } catch {
                return id;
              }
            })();
            const description = (() => {
              try {
                return tPicker(descKey);
              } catch {
                return '';
              }
            })();
            const icon = (() => {
              try {
                return tPicker(iconKey);
              } catch {
                return '';
              }
            })();
            // Roving-Tabindex (WAI-ARIA radiogroup): genau ein
            // fokussierbarer Eintrag. Ist nichts gewählt (Skelett-
            // Empfehlung aktiv), erhält der erste Eintrag tabindex 0.
            const focusIndex =
              pickerOrder.indexOf(formState.template) >= 0
                ? pickerOrder.indexOf(formState.template)
                : 0;
            const isTabStop = pickerOrder[focusIndex] === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={isTabStop ? 0 : -1}
                onClick={() => onTemplateClick(id)}
                className={cn(
                  'grid cursor-pointer grid-cols-[auto_1fr] items-start gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  highlighted
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-50/15'
                    : 'border-border hover:bg-muted/40',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                    checked ? 'border-primary' : 'border-border-strong',
                  )}
                >
                  {checked && (
                    <span className="size-2 rounded-full bg-primary" />
                  )}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      'font-medium',
                      highlighted
                        ? 'text-brand-700 dark:text-[var(--brand-700)]'
                        : 'text-text-primary',
                    )}
                  >
                    <span aria-hidden="true">{icon}</span> {label}
                  </span>
                  {description && (
                    <span
                      className={cn(
                        'text-xs',
                        highlighted
                          ? 'text-brand-700/90 dark:text-[var(--brand-700)]/90'
                          : 'text-muted-foreground',
                      )}
                    >
                      {description}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </motion.fieldset>

      <>
        {formState.template === 'termin_antwort' && (
          <fieldset
            className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3"
            aria-live="polite"
          >
            <legend className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {tTemplates('termin_antwort.mode_legend')}
            </legend>
            <div role="radiogroup" className="flex flex-col gap-2 text-sm">
              {(['bestaetigen', 'verschieben', 'absagen'] as ReplyTerminMode[]).map(
                (mMode) => (
                  <label
                    key={mMode}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="radio"
                      name="reply-termin-mode"
                      checked={formState.mode === mMode}
                      onChange={() => onModeChange(mMode)}
                      className="size-4 cursor-pointer"
                    />
                    <span>{tTemplates(`termin_antwort.mode.${mMode}`)}</span>
                  </label>
                ),
              )}
            </div>
          </fieldset>
        )}

        {formState.template === 'nachweis_einreichen' && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <label
              htmlFor="reply-nachweis-bezeichnung"
              className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              {tPicker('nachweis_einreichen.label')}
            </label>
            <Select
              value={formState.nachweisBezeichnung ?? undefined}
              onValueChange={onNachweisChange}
            >
              <SelectTrigger
                id="reply-nachweis-bezeichnung"
                className="w-full"
                aria-label={tPicker('nachweis_einreichen.label')}
              >
                <SelectValue
                  placeholder={tPicker('nachweis_einreichen.label')}
                />
              </SelectTrigger>
              <SelectContent>
                {nachweisBezeichnungen.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <motion.div className="flex flex-col gap-1" {...staggerProps()}>
          <label
            htmlFor="reply-body"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            {t('body_textarea_label')}
          </label>
          {/* Phase 6b — Skelett-Banner über Textarea (Audit-Finding #2).
              Sichtbar, sobald ein Skelett-Template einen Vortext in
              `formState.body` geschrieben hat — markiert deutlich, dass
              User den Inhalt prüfen muss. Verschieden vom unten stehenden
              `skelett_footer_no_legal_advice` (RDG-Hinweis). */}
          {currentIsSkelett && formState.body.trim().length > 0 && (
            <div
              role="note"
              data-testid="reply-skeleton-banner"
              className="rounded-md border-l-4 border-[var(--ds-color-warning)] bg-[var(--ds-color-warning-soft)] p-3 text-sm text-amber-950 dark:text-[var(--ds-color-text-primary)]"
            >
              {tReply('skeleton_disclaimer')}
            </div>
          )}
          <div className="relative overflow-hidden rounded-lg border border-border-strong bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring/60">
            <textarea
              id="reply-body"
              aria-describedby="reply-body-hint"
              aria-busy={templatePending || rewritePending}
              dir="ltr"
              lang="de"
              rows={Math.max(
                8,
                Math.min(20, formState.body.split('\n').length + 1),
              )}
              value={formState.body}
              placeholder={placeholder}
              onChange={(e) =>
                setFormState((s) => ({ ...s, body: e.target.value }))
              }
              className="min-h-[12rem] w-full resize-y border-0 bg-transparent p-3 pb-7 font-sans text-sm leading-relaxed outline-none"
            />
            {/* M3a — dezenter Lade-Schimmer über der Textarea, während ein
                Template/Rewrite geladen wird. Nur transform/opacity, reduced-
                motion killt die animate-pulse global (globals.css). */}
            {(templatePending || rewritePending) && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-0.5 motion-safe:animate-pulse bg-gradient-to-r from-transparent via-brand-500/60 to-transparent"
              />
            )}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-1.5 right-2.5 font-mono text-[10px] tabular-nums text-text-muted"
            >
              {t('char_count_template', { n: formState.body.length })}
            </span>
          </div>
          <p
            id="reply-body-hint"
            className="text-[11px] leading-relaxed text-muted-foreground"
          >
            {t('body_textarea_de_hint')}
          </p>
          {disclaimerInline && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {disclaimerInline}
            </p>
          )}
          {skelettFooter && (
            <p
              className="text-[11px] leading-relaxed text-muted-foreground"
              data-testid="skelett-footer-no-legal-advice"
            >
              {skelettFooter}
            </p>
          )}

          <KiAktionenChips
            body={formState.body}
            disabledForSkelett={currentIsSkelett}
            disabledOther={
              formState.body.trim().length === 0 || templatePending
            }
            pending={rewritePending}
            onPendingChange={setRewritePending}
            onApply={(nextBody) =>
              setFormState((s) => ({ ...s, body: nextBody }))
            }
          />
        </motion.div>

        <motion.div {...staggerProps()}>
          <AttachmentInput
            totalCount={totalAttachmentCount}
            persistedAttachments={formState.persistedAttachments}
            stagedAttachments={formState.attachments}
            errors={attachmentErrors}
            onAdd={onAttachmentSelect}
            onDropFiles={ingestFiles}
            onRemovePersisted={removePersistedAttachment}
            onRemoveStaged={removeStagedAttachment}
            onDismissErrors={() => setAttachmentErrors([])}
          />
        </motion.div>
      </>
    </div>
  );

  const footerNode = confirmation ? null : (
    <div className={composeFooterClass}>
      <div className="flex items-center justify-between gap-2">
        <span
          role="status"
          aria-live="polite"
          className={cn(
            'text-[11px]',
            savingState === 'error'
              ? 'text-destructive'
              : 'text-muted-foreground',
          )}
        >
          {draftSavedRel ?? ''}
        </span>
        {savingState === 'error' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void persistDraft()}
          >
            {t('draft_save_error_retry')}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setDiscardOpen(true)}
          className="rounded-[11px] text-destructive hover:bg-destructive/10"
          disabled={!draftId && formState.body.trim().length === 0}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {t('draft_discard_button')}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void persistDraft().then(() => onRequestClose())}
            disabled={savingState === 'saving'}
            className="rounded-[11px]"
          >
            {t('save_and_close_button')}
          </Button>
          <Button
            type="button"
            onClick={() => setVersandModalOpen(true)}
            disabled={
              formState.body.trim().length === 0 ||
              savingState === 'saving' ||
              versandPending ||
              templatePending
            }
            className="rounded-[11px]"
          >
            <Send className="size-4" aria-hidden="true" />
            {t('versand_button')}
          </Button>
        </div>
      </div>
    </div>
  );

  const chrome = (
    <>
      {headerNode}
      {bodyNode}
      {footerNode}
    </>
  );

  return (
    <>
      {renderShell(chrome)}

      <PreVersandModal
        open={versandModalOpen}
        onOpenChange={setVersandModalOpen}
        empfaengerBehoerde={empfaengerName}
        onConfirm={() => void onSendConfirm()}
        pending={versandPending}
      />

      <ReplyDiscardConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirm={() => void onDiscardConfirm()}
      />

      <ReplyTemplateSwitchConfirmDialog
        open={templateSwitchTarget !== null}
        onOpenChange={(next) => {
          if (!next) setTemplateSwitchTarget(null);
        }}
        dualSendMode={switchDualMode}
        onConfirm={() => {
          const target = templateSwitchTarget;
          setTemplateSwitchTarget(null);
          if (!target) return;
          if (isSkelettTemplate(target)) {
            // Standard-Switch zu Skelett: zuerst PreInsertionModal aufsetzen
            // (Hard-Line § 11.13), erst nach dessen Bestätigung Body laden.
            setPreInsertionTarget(target as ReplyTemplateId);
          } else {
            performTemplateSwitch(target);
          }
        }}
        onCancel={() => setTemplateSwitchTarget(null)}
        onDualSend={onDualSend}
      />

      <PreInsertionModal
        open={preInsertionTarget !== null}
        onOpenChange={(next) => {
          if (!next) setPreInsertionTarget(null);
        }}
        letter={letter}
        empfaengerBehoerde={empfaengerBehoerde}
        templateId={preInsertionTarget}
        onConfirm={() => {
          const target = preInsertionTarget;
          setPreInsertionTarget(null);
          if (!target) return;
          performTemplateSwitch(target);
          // Cross-Template-Versand-Pfad: nach Reply 2 PreInsertion-Confirm
          // wird der Body geladen — User klickt dann manuell auf Versenden,
          // der `crossSendStage === 'reply2-prep'` triggert im
          // onSendConfirm → 'reply2-pending' → 'done'.
          if (crossSendStage === 'reply2-prep') {
            setCrossSendStage('reply2-pending');
          }
        }}
        onCancel={() => setPreInsertionTarget(null)}
      />
    </>
  );
}

interface SpeculativeBannerProps {
  empfaenger: string;
}

function SpeculativeBanner({ empfaenger }: SpeculativeBannerProps) {
  const t = useTranslations('posteingang.compose');
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-lg border border-[var(--ds-color-warning)]/40 bg-[var(--ds-color-warning-soft)] p-3 text-xs leading-relaxed text-amber-950 dark:text-[var(--ds-color-text-primary)]"
    >
      <Info
        className="mt-0.5 size-4 shrink-0 text-[var(--ds-color-warning)]"
        aria-hidden="true"
      />
      <p>
        <span className="font-semibold">{t('speculative_banner_title')}.</span>{' '}
        {t('outbound_speculative', { behoerde: empfaenger })}
      </p>
    </div>
  );
}

interface AttachmentInputProps {
  totalCount: number;
  persistedAttachments: ReplyDraft['attachments'];
  stagedAttachments: File[];
  errors: AttachmentError[];
  onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDropFiles: (files: File[]) => void;
  onRemovePersisted: (i: number) => void;
  onRemoveStaged: (i: number) => void;
  onDismissErrors: () => void;
}

function AttachmentInput({
  totalCount,
  persistedAttachments,
  stagedAttachments,
  errors,
  onAdd,
  onDropFiles,
  onRemovePersisted,
  onRemoveStaged,
  onDismissErrors,
}: AttachmentInputProps) {
  const t = useTranslations('posteingang.compose.attachments');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const allowedTypes = LETTER_ATTACHMENT_LIMITS.ALLOWED_MIME.map((m) =>
    m.replace('application/', '').replace('image/', '').toUpperCase(),
  ).join(', ');
  const constraints = t('constraints_template', {
    maxFiles: LETTER_ATTACHMENT_LIMITS.MAX_FILES,
    maxFileMb: bytesToMb(LETTER_ATTACHMENT_LIMITS.MAX_BYTES_PER_FILE),
    maxTotalMb: bytesToMb(LETTER_ATTACHMENT_LIMITS.MAX_BYTES_TOTAL),
    allowedTypes,
  });
  const limitReached = totalCount >= LETTER_ATTACHMENT_LIMITS.MAX_FILES;

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <legend className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Paperclip className="mr-1 inline size-3" aria-hidden="true" />
        {t('label')}
      </legend>
      <p className="text-[11px] text-muted-foreground">{constraints}</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={LETTER_ATTACHMENT_LIMITS.ALLOWED_MIME.join(',')}
        onChange={onAdd}
        className="sr-only"
        id="reply-attachments"
        aria-label={t('add_button')}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={limitReached}
        aria-label={t('dropzone_aria')}
        data-drag={dragging ? 'true' : undefined}
        onDragEnter={(e) => {
          if (limitReached) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          if (limitReached) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (limitReached) return;
          const files = e.dataTransfer?.files
            ? Array.from(e.dataTransfer.files)
            : [];
          onDropFiles(files);
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-6 text-center text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          dragging
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-50/15'
            : 'border-border-strong hover:bg-muted/40',
        )}
      >
        <Paperclip className="size-5 text-text-muted" aria-hidden="true" />
        <span className="font-medium text-text-primary">
          {t('dropzone_cta')}
        </span>
        <span className="text-[11px] text-text-muted">{t('dropzone_hint')}</span>
      </button>

      {errors.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col gap-1 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive"
        >
          <p className="font-medium">{t('errors_heading')}</p>
          <ul className="flex flex-col gap-1">
            {errors.map((e, i) => (
              <li key={i}>{renderAttachmentError(e, t, allowedTypes)}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onDismissErrors}
            className="self-start text-[11px] underline underline-offset-4"
          >
            <X className="size-3" aria-hidden="true" /> OK
          </button>
        </div>
      )}

      {(persistedAttachments.length > 0 || stagedAttachments.length > 0) && (
        <ul className="flex flex-col gap-1 text-xs">
          {persistedAttachments.map((a, i) => (
            <li
              key={`p-${a.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5"
            >
              <span className="flex min-w-0 items-center gap-2 truncate">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-muted"
                  aria-hidden="true"
                >
                  <FileText className="size-3.5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-[11px] text-text-primary">
                    {a.name}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-text-muted">
                    {Math.round(a.size_bytes / 1024).toLocaleString('de-DE')} KB
                  </span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemovePersisted(i)}
                aria-label={t('remove_template', { name: a.name })}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
          {stagedAttachments.map((f, i) => (
            <li
              key={`s-${f.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border bg-muted/20 px-2 py-1.5"
            >
              <span className="flex min-w-0 items-center gap-2 truncate">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-surface text-text-muted"
                  aria-hidden="true"
                >
                  <FileText className="size-3.5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-[11px] text-text-primary">
                    {f.name}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-text-muted">
                    {Math.round(f.size / 1024).toLocaleString('de-DE')} KB
                  </span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemoveStaged(i)}
                aria-label={t('remove_template', { name: f.name })}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

interface KiAktionenChipsProps {
  body: string;
  /** RDG-Gate: bei Skelett-Templates (Einspruch/Widerspruch/Aussetzung) hart aus. */
  disabledForSkelett: boolean;
  /** Body leer ODER Template wird gerade geladen. */
  disabledOther: boolean;
  pending: boolean;
  onPendingChange: (next: boolean) => void;
  onApply: (nextBody: string) => void;
}

interface ChipDef {
  action: ReplyRewriteAction;
  labelKey: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  primary: boolean;
}

const KI_CHIPS: readonly ChipDef[] = [
  { action: 'umformulieren', labelKey: 'umformulieren', icon: Sparkles, primary: true },
  { action: 'kuerzer', labelKey: 'kuerzer', icon: Minimize2, primary: false },
  { action: 'formeller', labelKey: 'formeller', icon: ScrollText, primary: false },
  { action: 'einfacher', labelKey: 'einfacher', icon: Feather, primary: false },
] as const;

/**
 * KI-Aktionen-Chips (Spec §3.5 + §4.2). RDG-sicher: bei Rechtsbehelf-Skeletten
 * komplett gesperrt (die App formuliert keine rechtlichen Begründungen,
 * § 2 RDG). Sonst: POST /api/reply/rewrite → ersetzt den Body. Fehler lassen
 * den Body unverändert.
 */
function KiAktionenChips({
  body,
  disabledForSkelett,
  disabledOther,
  pending,
  onPendingChange,
  onApply,
}: KiAktionenChipsProps) {
  const t = useTranslations('posteingang.compose.ai_rewrite');
  const [busyAction, setBusyAction] = React.useState<ReplyRewriteAction | null>(
    null,
  );
  const [announcement, setAnnouncement] = React.useState('');

  const rowDisabled = disabledForSkelett || disabledOther || pending;

  async function runRewrite(action: ReplyRewriteAction) {
    if (rowDisabled) return;
    setBusyAction(action);
    onPendingChange(true);
    setAnnouncement('');
    try {
      const res = await fetch('/api/reply/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ReplyRewriteResponse;
      if (typeof data.body !== 'string') throw new Error('malformed');
      onApply(data.body);
      if (data.source === 'fallback') {
        toast(t('offline_fallback'));
      }
      setAnnouncement(t('done'));
    } catch {
      toast.error(t('error'));
    } finally {
      setBusyAction(null);
      onPendingChange(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {t('section_label')}
      </p>
      <div className="flex flex-wrap gap-2">
        {KI_CHIPS.map(({ action, labelKey, icon: Icon, primary }) => {
          const isBusy = busyAction === action;
          return (
            <button
              key={action}
              type="button"
              onClick={() => void runRewrite(action)}
              disabled={rowDisabled}
              aria-busy={isBusy}
              className={cn(
                'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50',
                primary
                  ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-50/70 dark:bg-brand-50/15'
                  : 'border-border-strong text-text-primary hover:bg-muted/40',
              )}
            >
              {isBusy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Icon className="size-3.5" aria-hidden={true} />
              )}
              {isBusy ? t('busy') : t(labelKey)}
            </button>
          );
        })}
      </div>
      {disabledForSkelett && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t('disabled_skelett_hint')}
        </p>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}

function renderAttachmentError(
  e: AttachmentError,
  t: (k: string, vars?: Record<string, string | number>) => string,
  allowedTypes: string,
): string {
  switch (e.type) {
    case 'too-many':
      return t('error_too_many', { maxFiles: LETTER_ATTACHMENT_LIMITS.MAX_FILES });
    case 'too-large-file':
      return t('error_too_large_file', {
        name: e.fileName ?? '',
        maxFileMb: bytesToMb(LETTER_ATTACHMENT_LIMITS.MAX_BYTES_PER_FILE),
      });
    case 'too-large-total':
      return t('error_total_too_large', {
        maxTotalMb: bytesToMb(LETTER_ATTACHMENT_LIMITS.MAX_BYTES_TOTAL),
      });
    case 'mime':
      return t('error_mime_not_allowed', {
        name: e.fileName ?? '',
        allowedTypes,
      });
  }
}
