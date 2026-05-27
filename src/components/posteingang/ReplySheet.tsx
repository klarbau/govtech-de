'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { parseISO } from 'date-fns';
import { toast } from 'sonner';
import { FileText, Paperclip, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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

interface ReplySheetProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  letter: Letter;
  empfaengerBehoerde: Behoerde | null;
  /** Optional: gesendete Reply, falls vorhanden — Sheet öffnet im Read-only-Confirmation-Mode. */
  existingReply: Reply | null;
  /** Wird nach Versand / Save gerufen, damit der Aufrufer Briefdaten neu lädt. */
  onPersisted?: () => void;
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

/**
 * Compose-Sheet (Spec V1.5 §4.3 + V1.5.1 §§ 6, 7, 8, 9).
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
export function ReplySheet({
  open,
  onOpenChange,
  letter,
  empfaengerBehoerde,
  existingReply,
  onPersisted,
}: ReplySheetProps) {
  const t = useTranslations('posteingang.compose');
  const tTemplates = useTranslations('posteingang.compose.templates');
  const tPicker = useTranslations('posteingang.compose.template_picker');
  // Phase 6b — neuer i18n-Tree für Skelett-Banner (`posteingang.reply.*`).
  const tReply = useTranslations('posteingang.reply');

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

  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!lastSavedAt) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [lastSavedAt]);

  React.useEffect(() => {
    if (!open) return;
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
  }, [open, letter.id, pickerOrder]);

  React.useEffect(() => {
    if (open) return;
    setFormState({
      template: 'freitext',
      mode: null,
      body: '',
      attachments: [],
      persistedAttachments: [],
      nachweisBezeichnung: null,
    });
    setRecommendedTemplate(null);
    setDraftId(null);
    setDraftCreatedAt(null);
    setLastSavedAt(null);
    setSavingState('idle');
    setVersandModalOpen(false);
    setDiscardOpen(false);
    setTemplateSwitchTarget(null);
    setPreInsertionTarget(null);
    setCrossSendStage('idle');
    setCrossSendAnnouncement('');
    setAttachmentErrors([]);
    setReadOnlyReply(null);
    setReplies(existingReply ? [existingReply] : []);
  }, [open, existingReply]);

  const lastSaveRef = React.useRef<{
    body: string;
    template: ReplyTemplateChoice;
    mode: ReplyTerminMode | null;
  }>({ body: '', template: 'freitext', mode: null });
  React.useEffect(() => {
    if (!open) return;
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
    open,
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

  function onAttachmentSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    const { valid, errors } = validateNewFiles(files);
    setAttachmentErrors(errors);
    if (valid.length > 0) {
      setFormState((s) => ({ ...s, attachments: [...s.attachments, ...valid] }));
    }
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
        // jetzt Sheet re-hydratisieren mit dem companion-Skelett-Template.
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
    onOpenChange(false);
    onPersisted?.();
  }

  /** Cross-Template-Versand starten — Spec § 8.3. */
  function onDualSend() {
    // Bei Klick „Beide als getrennte Briefe versenden": versende den aktuellen
    // Draft (Reply 1) zuerst; nach Erfolg re-hydratisiert `onSendConfirm` das
    // Sheet mit dem companion-Template (Reply 2).
    if (templateSwitchTarget) {
      // Wir merken uns den Companion-Wechsel implizit über den Template-State —
      // der Switch passiert NICHT vor dem Versand: Reply 1 behält das aktuelle
      // Template. Companion-Switch wird nach Versand 1 in `onSendConfirm` für
      // Reply 2 aufgesetzt.
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          aria-labelledby="reply-sheet-title"
          closeAriaLabel={t('sheet_close_aria')}
        >
          <SheetHeader>
            <SheetTitle id="reply-sheet-title">
              {confirmation
                ? t('confirmation.headline')
                : t('sheet_title', { behoerde: empfaengerName })}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              {t('recipient_label_template', { behoerde: empfaengerName })}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {t('bezug_label_template', { aktenzeichen: letter.aktenzeichen })}
            </p>
          </SheetHeader>

          {confirmation ? (
            <>
              <SheetBody>
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
                    onClose={() => onOpenChange(false)}
                    onViewSubmittedBody={(r) => setReadOnlyReply(r)}
                  />
                )}
              </SheetBody>
            </>
          ) : (
            <>
              <SheetBody>
                <SpeculativeBanner empfaenger={empfaengerName} />

                <FristAbgelaufenWarnung
                  letter={letter}
                  templateId={formState.template}
                />

                <FristCitedFormatHeader
                  letter={letter}
                  templateId={formState.template}
                />

                <BekanntgabeCaveatDetails letter={letter} />

                <div
                  className="sr-only"
                  role="status"
                  aria-live="polite"
                  data-testid="cross-send-announcement"
                >
                  {crossSendAnnouncement}
                </div>

                <fieldset className="flex flex-col gap-2">
                  <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tPicker('legend')}
                  </legend>
                  <div
                    role="radiogroup"
                    aria-labelledby="template-picker-title"
                    className="grid gap-2 sm:grid-cols-1"
                  >
                    {pickerOrder.map((id) => {
                      // Solange eine Skelett-Empfehlung vorliegt (= User hat
                      // noch keine bewusste Wahl getroffen), wird KEIN Radio
                      // als "ausgewählt" gerendert — sonst doppelter
                      // Highlight (recommended + checked auf zwei Zeilen).
                      const isRecommendationActive =
                        recommendedTemplate !== null;
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
                      return (
                        <label
                          key={id}
                          className={cn(
                            'flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors',
                            highlighted
                              ? 'border-foreground/40 bg-muted'
                              : 'border-border hover:bg-muted/40',
                          )}
                        >
                          <input
                            type="radio"
                            name="reply-template"
                            checked={checked}
                            onChange={() => onTemplateClick(id)}
                            className="mt-1 size-4 cursor-pointer"
                          />
                          <span className="flex flex-col gap-0.5">
                            <span className="font-medium">
                              <span aria-hidden="true">{icon}</span>{' '}
                              {label}
                            </span>
                            {description && (
                              <span
                                className={cn(
                                  'text-xs',
                                  highlighted
                                    ? 'text-foreground/85'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {description}
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

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
                        (m) => (
                          <label
                            key={m}
                            className="flex cursor-pointer items-center gap-2"
                          >
                            <input
                              type="radio"
                              name="reply-termin-mode"
                              checked={formState.mode === m}
                              onChange={() => onModeChange(m)}
                              className="size-4 cursor-pointer"
                            />
                            <span>{tTemplates(`termin_antwort.mode.${m}`)}</span>
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

                <div className="flex flex-col gap-1">
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
                  <textarea
                    id="reply-body"
                    aria-describedby="reply-body-hint"
                    aria-busy={templatePending}
                    dir="ltr"
                    lang="de"
                    rows={Math.max(8, Math.min(20, formState.body.split('\n').length + 1))}
                    value={formState.body}
                    placeholder={placeholder}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, body: e.target.value }))
                    }
                    className="min-h-[12rem] w-full resize-y rounded-lg border border-border bg-background p-3 font-sans text-sm leading-relaxed shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  />
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
                </div>

                <AttachmentInput
                  totalCount={totalAttachmentCount}
                  persistedAttachments={formState.persistedAttachments}
                  stagedAttachments={formState.attachments}
                  errors={attachmentErrors}
                  onAdd={onAttachmentSelect}
                  onRemovePersisted={removePersistedAttachment}
                  onRemoveStaged={removeStagedAttachment}
                  onDismissErrors={() => setAttachmentErrors([])}
                />
              </SheetBody>

              <SheetFooter>
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
                    size="sm"
                    onClick={() => setDiscardOpen(true)}
                    className="text-destructive hover:bg-destructive/10"
                    disabled={!draftId && formState.body.trim().length === 0}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t('draft_discard_button')}
                  </Button>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void persistDraft().then(() => onOpenChange(false))}
                      disabled={savingState === 'saving'}
                    >
                      {t('save_and_close_button')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setVersandModalOpen(true)}
                      disabled={
                        formState.body.trim().length === 0 ||
                        savingState === 'saving' ||
                        versandPending ||
                        templatePending
                      }
                    >
                      {t('versand_button')}
                    </Button>
                  </div>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

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
          // der `crossSendStage === 'reply2-prep'` triggered im
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
    <p className="rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100">
      <span className="font-semibold">{t('speculative_banner_title')}.</span>{' '}
      {t('outbound_speculative', { behoerde: empfaenger })}
    </p>
  );
}

interface AttachmentInputProps {
  totalCount: number;
  persistedAttachments: ReplyDraft['attachments'];
  stagedAttachments: File[];
  errors: AttachmentError[];
  onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  onRemovePersisted,
  onRemoveStaged,
  onDismissErrors,
}: AttachmentInputProps) {
  const t = useTranslations('posteingang.compose.attachments');
  const inputRef = React.useRef<HTMLInputElement>(null);
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={limitReached}
        className="self-start"
      >
        <Paperclip className="size-4" aria-hidden="true" />
        {t('add_button')}
      </Button>

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
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2 py-1"
            >
              <span className="flex min-w-0 items-center gap-1 truncate font-mono text-[11px]">
                <FileText className="size-3" aria-hidden="true" />
                {a.name}
                <span className="text-muted-foreground">
                  · {Math.round(a.size_bytes / 1024).toLocaleString('de-DE')} KB
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemovePersisted(i)}
                aria-label={t('remove_template', { name: a.name })}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
          {stagedAttachments.map((f, i) => (
            <li
              key={`s-${f.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border bg-muted/20 px-2 py-1"
            >
              <span className="flex min-w-0 items-center gap-1 truncate font-mono text-[11px]">
                <FileText className="size-3" aria-hidden="true" />
                {f.name}
                <span className="text-muted-foreground">
                  · {Math.round(f.size / 1024).toLocaleString('de-DE')} KB
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemoveStaged(i)}
                aria-label={t('remove_template', { name: f.name })}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
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
