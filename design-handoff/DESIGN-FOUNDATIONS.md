# GovTech DE — Design Foundations („Waldgrün")

> Дизайн-хэндофф для Claude Design. Это основы нашего нового **зелёного** дизайна
> (Waldgrün = «лесная зелень»). Все значения — реальные токены из кода
> (`src/app/globals.css` + `src/app/prototype-v2.css`), не приблизительные.
> Скриншоты — в `./screenshots/` (рендер текущей ветки `feat/termine-vorgemerkt`,
> light + dark, 1440×900 @2x).

---

## 1. Дизайн-идея в одном предложении

> **Серьёзное, уважительное к гражданину госуслужебное приложение в духе
> gov.uk / DigitalService DE — спокойный минимализм, где «героем» является не
> красивая форма, а то, что система делает _за_ пользователя (Autopilot).**

Тон: доверие, спокойствие, прозрачность. НЕ финтех-глянец, НЕ «AI-стартап»,
НЕ копия российского Госуслуг. Зелёный = природный, институциональный,
а не «эко-маркетинговый» неон.

---

## 2. Цвет — палитра Waldgrün

### 2.1 Бренд (primary) — глубокая лесная зелень

| Токен | Light | Назначение |
|---|---|---|
| `--brand-600` / `--color-primary` | `#0F3D2E` | **Waldgrün — основной бренд-цвет.** Кнопки, акценты, логотип-крест. Белый текст по нему = контраст 11.7:1 |
| `--brand-700` / `--color-primary-hover` | `#0C3325` | hover-состояние |
| `--color-primary-active` | `#0A2A1F` | active/нажатие |
| `--brand-900` | `#0B1220` | **Tintenblau** (чернильно-синий) — _только_ для wordmark/логотипа, почти чёрный |
| `--brand-500` | `#1E5C46` | промежуточный |
| `--brand-200` | `#AEC6BB` | бордеры на тинте |
| `--brand-100` | `#D6E1DB` | бордеры пилюль |
| `--brand-50` / `--color-accent-soft` | `#ECF1EE` | мягкая зелёная подложка: активная пилюля в навигации, фон AI-блока, info-чип. Текст brand-600 по ней = 10:1 |

`--brand-fill` = `--brand-600` (`#0F3D2E`) — отдельный токен для всех
заливок, несущих **белый текст** (primary-кнопки, счётчики-пилюли, аватары,
кнопка отправки). Держится насыщенным в обеих темах (в тёмной не «светлеет»).

### 2.2 Нейтральные — тёплые, чуть зеленоватые (не чисто-серые)

| Токен | Light | Назначение |
|---|---|---|
| `--color-surface` | `#FFFFFF` | карточки + тело страницы |
| `--color-surface-page` / `--bg` | `#FAFAF8` | **Warmweiß** — тёплый фон-канвас за белыми карточками |
| `--color-surface-muted` | `#E7ECE7` | **Graugrün** — hover-заливки, тинтованные строки, неактивные пилюли |
| `--color-border` | `#DEE3DF` | тёплые волосяные линии 1px (в сторону нейтрально-серого) |
| `--color-border-strong` | `#C4C9C3` | бордер инпутов, акцентные разделители |
| `--ink` / `--color-text-primary` | `#0B1220` | **Tintenblau** — заголовки, body (≥16:1) |
| `--ink-2` | `#28332C` | вторичный зелёно-чернильный (метки навигации, кнопки хедера) |
| `--ink-3` / `--color-text-secondary` | `#4B5563` | вторичный текст, заголовки таблиц (≥7:1) |
| `--ink-4` / `--color-text-muted` | `#545C69` | подписи, мета (6.75:1 vs белый) |

> Ключевая деталь: фон страницы — **тёплый off-white `#FAFAF8`**, а не чисто
> белый. Нейтрали слегка тёплые/зеленоватые → весь экран «лежит» в одной
> зелёной семье, без холодного серого.

### 2.3 Семантические (статусы) — Light

| Токен | Light | + soft-подложка |
|---|---|---|
| `--color-success` | `#137034` | `--color-success-soft` `#E7F6EC` |
| `--color-warning` | `#B45309` (янтарный) | `--color-warning-soft` `#FEF3DA` |
| `--color-danger` | `#B91C1C` | `--color-danger-soft` `#FCE8E8` |
| `--color-info` | `#0F3D2E` (= Waldgrün) | `--color-info-soft` `#ECF1EE` |

Все пары текст/подложка проверены на контраст ≥ AA (5.5:1).

### 2.4 Тёмная тема (dark) — критично

Важный приём: в тёмной теме `--brand-600/700` **«поднимаются» в светлый
мятный тинт** (`#7FCFB0`) — потому что в тёмной их роль = текст/иконка/метка
на тёмной зелёной пилюле. А заливки (`--brand-fill`) остаются насыщенными
(`#2E7D5B`), чтобы белый текст по ним проходил AA. Это два _разных_ токена
именно по этой причине.

| Токен | Dark |
|---|---|
| `--color-surface-page` (канвас) | `#0D1117` (самый тёмный слой) |
| `--color-surface` (карточка) | `#161B23` (ступень выше канваса) |
| `--color-surface-raised` (поповеры/диалоги) | `#1C232F` |
| `--color-surface-muted` | `#222934` |
| `--color-border` | `#333B47` |
| `--color-text-primary` | `#ECEFF4` |
| `--color-text-secondary` | `#B6BDC9` |
| `--brand-600/700` (текст/иконка на тинте) | `#7FCFB0` (мятный) |
| `--brand-900` (wordmark/крест) | `#A8D8C4` |
| `--brand-fill` (заливка под белый текст) | `#2E7D5B` |
| `--brand-50` (пилюля активной навигации) | `#16291F` |
| `--color-success` | `#5CC98A` |
| `--color-warning` | `#E3B341` |
| `--color-danger` | `#F2837C` |

> Антипаттерн, который мы уже ловили: тинтованные зелёные плашки
> (`bg-brand-50`) в тёмной теме давали «светлое-по-светлому». Правило:
> всегда проверять axe в `.dark`; тинт-плашка должна флипаться вместе с
> текстовым токеном.

---

## 3. Типографика

| Роль | Шрифт | Где |
|---|---|---|
| **Display / заголовки** | **Inter Tight** (`--font-display`) | `h1`, `.text-display`, `.text-3xl`, `.text-2xl`. Чуть плотнее обычного Inter — даёт «институциональный» вес заголовкам |
| **Body / UI** | **Inter** (`--font-sans`) | весь остальной текст, формы, мета |

Оба подключены через `next/font/google` (`src/app/layout.tsx`).

Шкала (из токенов): h1 `1.875rem` (30px), h2 `1.125rem`, h3/body `1rem`,
small `0.875rem`. Line-height body `1.6`, small `1.5`.

Характерные размеры из компонентов: страничный заголовок 30px / weight 700 /
`letter-spacing: -0.015em`; крупные числа-статистики 30px / 700 /
`-0.02em` + `font-variant-numeric: tabular-nums` (важно: цифры
табличные — счётчики/суммы не «прыгают»).

---

## 4. Форма, радиусы, тени, сетка

**Радиусы** (мягкие, но не «таблеточные»):
- `--radius` = `0.75rem` (12px) — карточка по умолчанию
- `--radius-card` = `0.875rem` (14px) — wallet / mDL-карточка
- `--r-md` ≈ 8–10px — кнопки, инпуты, чипы; пилюли/счётчики — `999px`

**Тени — почти плоские, «border-first»** (граница важнее тени):
```
--shadow-card:    0 1px 2px 0 rgb(16 24 40 / 0.04)
--shadow-popover: 0 4px 12px -2px rgb(16 24 40 / 0.08)
--shadow-modal:   0 12px 32px -8px rgb(16 24 40 / 0.14)
```
Карточки разделяются **1px-границей `--color-border`**, а не глубокой тенью.
Плоско, спокойно, по-госовски.

**Оболочка приложения (shell):**
- Верхний **top-nav** (горизонтальная навигация в хедере), `--header-h`
- Логотип = зелёный крест-знак + wordmark `GovTech DE`
- Контентная ширина ограничена (`.gt-content` / `.app-content`); полноширинные
  блоки — через `.app-content:has(.sd-wide)`, **не** `100vw`

**Иконки:** lucide-react, 16–20px, в нейтрально-серой плитке `--icon-tile`
(а НЕ в зелёном тинте — зелёные плитки под каждой иконкой = «AI-default»
вид, который мы намеренно убрали в де-темплейтинг-пассе 2026-06-18).

**Анимация:** framer-motion, сдержанно. Easing-токены
(`--ds-ease-out-quart` и др.), длительности 150/250/400/600ms. Уважать
`prefers-reduced-motion`.

---

## 5. Паттерны компонентов (узнаваемый «язык» экранов)

- **Command-center layout** (Vorgänge, Termine): ряд из 4 KPI-плиток сверху →
  тулбар (поиск + табы-чипы + фильтр) → основная колонка (таймлайн/карточки) +
  правый рельс «Was ist jetzt wichtig?» (задачи / сроки / быстрый доступ).
- **Зелёный таймлайн** (Umzug / Vorgang): горизонтальные шаги с зелёными
  галочками-узлами, «X von 5 erledigt».
- **Карточки процессов** с явной строкой **«Nächste Aktion»** (следующий шаг).
- **Dossier-вид** (Lebenslagen detail, Umzug /run): хлебные крошки → cascade-
  степпер → «Beteiligte Stellen» → `[MOCK]` Nachweise → Once-Only панель →
  правый рельс «Auf einen Blick / Nächster Schritt».
- **Privacy-by-design на каждом экране**: что обрабатывается, кем, на каком
  правовом основании (§§). Видимая «Datenminimierung».
- **Табы-чипы**: неактивные — нейтральные; активная — `--brand-50` фон +
  `--brand-700` текст + счётчик в `--brand-100`.
- **Бейджи**: `.badge.brand` (зелёный тинт), `.outline`, soft-статусы.

---

## 6. Голос и язык (влияет на дизайн текста)

- **Primary: Deutsch, Sie-форма.** Вторичные: EN, RU, UK, AR (RTL), TR.
- Реальные названия Behörden, реальные PLZ, форматы Aktenzeichen. Где полезно —
  пометка `[MOCK]`; будущие фичи — `[ZUKUNFT 2027]`.
- Тон строк: спокойный, объясняющий, без маркетинга и восклицаний.

---

## 7. Обязательные ограничения (не нарушать в новом дизайне)

1. **WCAG 2.1 AA + BITV 2.0** — обязательно. Каждый цвет в палитре уже подобран
   под контраст; новые пары проверять axe в **обеих** темах (light + dark).
2. **Privacy-by-design видим** на каждом экране с перс. данными.
3. Поддержка **font-scale** (zoom 100/115/130/150%), high-contrast режима,
   reduce-motion, RTL для арабского.
4. Регистр: **строго gov.uk/DigitalService**, без финтех-глянца и неона.
5. Полноширинные блоки — без `100vw` (вызывает overflow); известный
   pre-existing момент: TopNav может давать горизонтальный overflow на 390–420px.

---

## 8. Карта скриншотов (`./screenshots/`)

**Light:**
| Файл | Экран |
|---|---|
| `00-landing.png` | Лендинг «Verwaltung, die vorausdenkt» — герой + Lebenslagen-сетка + trust-bar |
| `01-onboarding-login.png` | Вход: DeutschlandID / EUDI Wallet / Demo-режим |
| `02-lebenslagen-hub.png` | Хаб жизненных ситуаций (поиск + чипы + популярные карточки) |
| `03-lebenslagen-detail-pflegegrad.png` | Detail-дос­сье (cascade-степпер, Beteiligte Stellen, Once-Only, §§) |
| `04-vorgaenge.png` | Command-center процессов (4 KPI + зелёный таймлайн Umzug + рельс) |
| `05-termine.png` | Command-center записей/сроков (календарь + панель «Termindetails») |
| `06-stammdaten.png` | Green-bento профиль (ring-header + wallet/once-only карточки) |
| `07-dashboard.png` | Übersicht (heute / открытые Vorgänge / Fristen) |
| `08-posteingang.png` | Единый входящий Behörden-Briefe + AI-разбор |
| `09-dokumente.png` | QR-хранилище документов |

**Dark:**
| Файл | Экран |
|---|---|
| `10-dark-landing.png` | Лендинг, тёмная тема |
| `11-dark-vorgaenge.png` | Command-center процессов, тёмная тема |
| `12-dark-lebenslagen-detail.png` | Detail-досье, тёмная тема (мятные акценты `#7FCFB0`) |

---

## 9. Шпаргалка — копипаст-палитра

```
LIGHT
brand/primary  #0F3D2E   hover #0C3325   active #0A2A1F
brand soft     #ECF1EE   (подложки, активная навигация)
wordmark ink   #0B1220   (Tintenblau)
page bg        #FAFAF8   (Warmweiß)
card           #FFFFFF
border         #DEE3DF / strong #C4C9C3
text           #0B1220 / #4B5563 / #545C69
success #137034  warning #B45309  danger #B91C1C  info #0F3D2E

DARK
page bg  #0D1117   card #161B23   raised #1C232F   muted #222934
border   #333B47
text     #ECEFF4 / #B6BDC9 / #9AA2B0
brand text/icon #7FCFB0   wordmark #A8D8C4   fill #2E7D5B
success #5CC98A  warning #E3B341  danger #F2837C

TYPE      Display: Inter Tight · Body/UI: Inter
RADIUS    card 12px · wallet 14px · pill 999px
SHADOW    near-flat, border-first (1px #DEE3DF)
```
