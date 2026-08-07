# Pitch Coach

Practice speaking on camera and get scored on what you actually said. Four modes —
**Interview**, **Impromptu**, **Pitch**, **Script** — each driven by your own topic and
your own knowledge base, with Claude acting as the coach.

Successor to the single-file `pitch-coach.html` on the Desktop: same core loop (camera +
mic + 60-second timer + live transcript), but the questions and the coaching are now
generated for whatever topic you point it at, and the whole thing deploys as a web app.

---

## The loop

1. Pick a mode and type a topic — a role, a company, a subject, anything.
2. Optionally load a knowledge base: paste notes, or upload your resume / the JD / a spec.
3. **Get questions** — Claude writes questions specific to your topic and material.
4. **Start answering** — camera opens, timer runs, transcript builds live.
5. **Stop** — watch it back, fix any mis-heard words in the transcript.
6. **Get coaching** — a score out of 100, a per-dimension breakdown, what worked, the
   highest-leverage fixes with exact replacement wording, a model answer you could say
   out loud in the target time, and the question to run next.

---

## Works with or without an API key

| | With an Anthropic key | Without |
|---|---|---|
| Camera, mic, timer, playback | ✅ | ✅ |
| Live transcript | ✅ | ✅ |
| Delivery metrics (pace, fillers, structure, length) | ✅ | ✅ |
| Questions | Written for your topic + knowledge base | Built-in bank, `{{topic}}` substituted |
| Coaching | Full content + delivery analysis | Delivery only, scored locally |
| Escape hatch | — | **Copy prompt for Claude** builds the whole coaching prompt for pasting anywhere |

There are two ways a key can reach the app, checked in this order:

1. **`x-anthropic-key` header** — your key, pasted into Settings, kept in your browser's
   `localStorage` and sent on each request. Never stored server-side.
2. **`ANTHROPIC_API_KEY` env var** — the deployment's key, so anyone you share the URL
   with gets coaching without pasting anything (billed to you).

If neither exists the API returns `428` and the app quietly falls back to local scoring.

---

## Run it locally

```bash
cd ~/Projects/pitch-coach
npm install
cp .env.example .env.local     # optional — add ANTHROPIC_API_KEY, or just use Settings
npm run dev                    # http://localhost:3000
```

`localhost` counts as a secure origin, so the camera works without TLS.

## Deploy to Vercel

```bash
npm i -g vercel     # if you don't have it
vercel              # link + first deploy
vercel --prod
```

Then either set `ANTHROPIC_API_KEY` in **Project → Settings → Environment Variables**
(so the deployed app just works), or leave it unset and paste a key into Settings in the
browser. Do **not** name it `NEXT_PUBLIC_ANTHROPIC_API_KEY` — that would ship your key to
every visitor.

One caveat on Hobby: serverless functions are capped at 60s. Analysis at `max` effort with
a large knowledge base can exceed that. Drop effort to `high` or `medium` in Settings, or
use a Pro project (the route already declares `maxDuration = 120`).

---

## macOS and iOS

The camera path is the fiddly part on Apple devices, so it's handled explicitly:

- **`getUserMedia` needs a secure origin.** `localhost` and any `https://` Vercel URL are
  fine; a `file://` page or a bare LAN IP is not. This is why the old single-file version
  needed `python3 -m http.server`.
- **`playsinline` is set** on both video elements, so iOS previews in place instead of
  hijacking into fullscreen.
- **Recording format is negotiated, not hard-coded.** Safari records `video/mp4`, Chrome
  records `video/webm` — passing the wrong one to `MediaRecorder` throws on Safari. The app
  probes `isTypeSupported` and picks the first that works. On the oldest iOS versions with
  no `MediaRecorder` at all, everything except playback still works.
- **Speech recognition restarts itself.** Safari (macOS and iOS 14.5+) ignores `continuous`
  and ends the session on every pause. The transcriber restarts it and accumulates finals
  across restarts, so a take with pauses in it still produces one transcript. Chrome honours
  `continuous` and needs none of this.
- **Firefox has no speech recognition at all.** Recording and scoring still work; the
  transcript box is editable, so you type or dictate it in after the take.
- **Inputs are 16px** and the viewport is pinned, so iOS doesn't zoom on focus.

The transcript is always editable before scoring — worth using, since live speech-to-text
mangles proper nouns and technical terms exactly when they matter most.

---

## Customizing the coach

The **Prompts** tab is a live editor for the four prompts the app actually sends:

| Prompt | What it controls |
|---|---|
| Question generator — system | Who the asker is, how questions should feel |
| Question generator — user | The ask itself, run per "New questions" |
| Coach — system | The rubric and standards |
| Coach — user | How the take is presented for scoring |

Edits save to your browser and can be reset per-prompt or all at once. Available variables
(`{{topic}}`, `{{knowledge}}`, `{{transcript}}`, `{{metrics}}`, `{{formula}}`, …) are listed
under the editor, and unknown ones get flagged rather than silently rendering as empty.

A mode-specific rubric is appended to the coach system prompt automatically — see
`MODE_RUBRICS` in [`src/lib/prompts.ts`](src/lib/prompts.ts) to change what each mode scores.

---

## Layout

```
src/
├─ app/
│  ├─ api/coach/route.ts   Anthropic proxy: key resolution, structured JSON, typed errors
│  ├─ layout.tsx           metadata + viewport (iOS-safe)
│  └─ page.tsx
├─ components/
│  ├─ CoachApp.tsx         orchestration + state
│  ├─ Recorder.tsx         video preview, playback, timer bar
│  ├─ FeedbackPanel.tsx    score, breakdown, fixes, model answer
│  └─ SidePanels.tsx       Settings / Knowledge / Prompt Studio
└─ lib/
   ├─ modes.ts             the four modes + fallback question banks
   ├─ prompts.ts           editable templates + {{var}} rendering
   ├─ schemas.ts           JSON Schemas for guaranteed-parseable responses
   ├─ metrics.ts           local measurement (pace, fillers, structure, coverage)
   ├─ localCoach.ts        the no-key scorer + clipboard prompt builder
   ├─ speech.ts            Web Speech wrapper with Safari restart handling
   ├─ media.ts             getUserMedia + MediaRecorder format negotiation
   ├─ files.ts             knowledge base import (.txt/.md/.csv/.json/.pdf)
   ├─ storage.ts           localStorage persistence
   └─ client.ts            typed fetch layer for /api/coach
```

Model requests use `claude-opus-5` with adaptive thinking and
`output_config.format` (JSON Schema), so the coaching response is guaranteed parseable
rather than best-effort. Model and effort are both overridable in Settings.

---

## Privacy

Video and audio never leave the device — recording, playback, and the timer are entirely
local, and takes are held in memory as object URLs. What crosses the network on a coaching
request is the question, your transcript, your topic, the measured metrics, and your
knowledge base — sent to Anthropic and nowhere else. Settings, prompts, knowledge base, and
take history live in `localStorage`; take history deliberately drops the media so it can't
blow the storage quota.

---

## Known gaps

- **The live Claude round-trip is untested** — this was built without an API key available,
  so the request shape is verified against the SDK's types and every error branch was
  exercised, but no real coaching response has been round-tripped. Expect to shake out
  something on the first real run.
- **PDF import is text-layer only.** A scanned PDF has nothing to extract; there's no OCR.
- **No transcription fallback when the browser has none.** Firefox users type the transcript
  in. Adding a Whisper-class model would fix it, but Claude has no speech-to-text endpoint,
  so it would mean a second provider or a WASM model.
- **Script coverage is keyword-based**, not semantic — it rewards hitting the distinctive
  terms of each beat, so heavy paraphrasing can read as a miss.
