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
import {
  nachweisBezeichnungen,
  type ReplyTemplateId as TemplateChoice,
} from '@/lib/mock-backend/reply-templates';
import {
  LETTER_ATTACHMENT_LIMITS,
  type Behoerde,
  type Letter,
  type Reply,
  type ReplyDraft,
  type ReplyTemplateId,
  type ReplyTerminMode,
} from '@/types';

import { PreVersandModal } from './PreVersandModal';
import { ReplyConfirmationView } from './ReplyConfirmationView';
import { ReplyDiscardConfirmDialog } from './ReplyDiscardConfirmDialog';
import { ReplyTemplateSwitchConfirmDialog } from './ReplyTemplateSwitchConfirmDialog';

const TEMPLATE_IDS: ReplyTemplateId[] = [
  'frist_verlaengerung',
  'nachweis_einreichen',
  'informative_rueckmeldung',
  'termin_antwort',
];

const TEMPLATE_CHOICES: TemplateChoice[] = [...TEMPLATE_IDS, 'freitext'];

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
  template: TemplateChoice;
  mode: ReplyTerminMode | null;
  body: string;
  attachments: File[];
  /** persistierte Mock-Anhänge (nur Metadaten). */
  persistedAttachments: ReplyDraft['attachments'];
  /** Controlled-list-Auswahl für `nachweis_einreichen` (Domain §8 / Spec
   *  §1399). Wird beim Resolver als `userInput.nachweis_bezeichnung`
   *  übergeben — ein Free-Text-Feld ist für diesen Slot bewusst gesperrt
   *  (RDG-Drift-Schutz). */
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
 * Compose-Sheet (Spec §4.3). 480 px Desktop / fullscreen Mobile; AR-RTL
 * flippt zur linken Kante via Tailwind `rtl:`-Variants. Reply-Textarea
 * bleibt LTR-DE (`dir="ltr" lang="de"`) unabhängig von UI-Locale.
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

  const [formState, setFormState] = React.useState<FormState>({
    template: 'freitext',
    mode: null,
    body: '',
    attachments: [],
    persistedAttachments: [],
    nachweisBezeichnung: null,
  });
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
    React.useState<TemplateChoice | null>(null);
  const [attachmentErrors, setAttachmentErrors] = React.useState<AttachmentError[]>(
    [],
  );
  const [personaId, setPersonaId] = React.useState<string | null>(null);
  const [templatePending, setTemplatePending] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState<Reply | null>(
    existingReply,
  );
  const [readOnlyView, setReadOnlyView] = React.useState(false);

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
        const reply = await api.getReplyByLetterId(letter.id);
        if (cancelled) return;
        if (reply && reply.status === 'sent_simulated') {
          setConfirmation(reply);
          return;
        }
      } catch {
        // fall through to draft lookup
      }
      try {
        const draft = await api.getReplyDraft(letter.id);
        if (cancelled) return;
        if (draft) {
          const tpl: TemplateChoice = draft.template_id ?? 'freitext';
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
        }
      } catch {
        // no persisted draft
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, letter.id]);

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
    setDraftId(null);
    setDraftCreatedAt(null);
    setLastSavedAt(null);
    setSavingState('idle');
    setVersandModalOpen(false);
    setDiscardOpen(false);
    setTemplateSwitchTarget(null);
    setAttachmentErrors([]);
    setReadOnlyView(false);
  }, [open]);

  const lastSaveRef = React.useRef<{ body: string; template: TemplateChoice; mode: ReplyTerminMode | null }>(
    { body: '', template: 'freitext', mode: null },
  );
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
    if (formState.body.trim().length === 0 && formState.persistedAttachments.length === 0 && formState.attachments.length === 0) {
      return;
    }
    const handle = window.setTimeout(() => {
      void persistDraft();
    }, 2000);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.body, formState.template, formState.mode, formState.attachments.length, open, confirmation]);

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
    next: TemplateChoice,
    modeNext: ReplyTerminMode | null,
    nachweisNext: string | null,
  ) {
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

  function performTemplateSwitch(next: TemplateChoice) {
    if (next === 'termin_antwort') {
      void loadTemplateBody(next, formState.mode ?? 'bestaetigen', null);
    } else if (next === 'nachweis_einreichen') {
      void loadTemplateBody(next, null, formState.nachweisBezeichnung);
    } else {
      void loadTemplateBody(next, null, null);
    }
  }

  function onTemplateClick(next: TemplateChoice) {
    if (formState.template === next) return;
    if (formState.body.trim().length > 0) {
      setTemplateSwitchTarget(next);
      return;
    }
    performTemplateSwitch(next);
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
      setConfirmation(sent);
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
                {readOnlyView ? (
                  <div className="flex flex-col gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setReadOnlyView(false)}
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
                      {confirmation.body_de}
                    </pre>
                  </div>
                ) : (
                  <ReplyConfirmationView
                    reply={confirmation}
                    letterId={letter.id}
                    empfaengerBehoerde={empfaengerName}
                    kanalHeute={kanalHeute}
                    onClose={() => onOpenChange(false)}
                    onViewSubmittedBody={() => setReadOnlyView(true)}
                  />
                )}
              </SheetBody>
            </>
          ) : (
            <>
              <SheetBody>
                <SpeculativeBanner empfaenger={empfaengerName} />

                <fieldset className="flex flex-col gap-2">
                  <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tPicker('legend')}
                  </legend>
                  <div
                    role="radiogroup"
                    aria-labelledby="template-picker-title"
                    className="grid gap-2 sm:grid-cols-1"
                  >
                    {TEMPLATE_CHOICES.map((id) => {
                      const checked = formState.template === id;
                      return (
                        <label
                          key={id}
                          className={cn(
                            'flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-colors',
                            checked
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
                              <span aria-hidden="true">
                                {tPicker(`${id}.icon`)}
                              </span>{' '}
                              {tPicker(`${id}.label`)}
                            </span>
                            <span
                              className={cn(
                                'text-xs',
                                checked
                                  ? 'text-foreground/85'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {tPicker(`${id}.description`)}
                            </span>
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
                    {/* TODO(post-V1.5): dedizierte i18n-Keys
                        `posteingang.compose.templates.nachweis_einreichen.bezeichnung_label`
                        + `…bezeichnung_placeholder` ergänzen, sobald
                        i18n-localizer für V1.5.1 sechs Locales pflegt. Bis
                        dahin re-using `template_picker.label` (DE: „Nachweis
                        einreichen") als sinnvolle Beschriftung — Domain §8
                        verbietet Free-Text, der `<Select>` ist Pflicht. */}
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
                  {formState.template !== 'freitext' && (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {tTemplates(`${formState.template}.disclaimer_inline`)}
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
                      size="xs"
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
        onConfirm={() => {
          const target = templateSwitchTarget;
          setTemplateSwitchTarget(null);
          if (target) performTemplateSwitch(target);
        }}
        onCancel={() => setTemplateSwitchTarget(null)}
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
