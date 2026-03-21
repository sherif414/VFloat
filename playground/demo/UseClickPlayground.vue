<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import UseClickPlaygroundSurface from "./UseClickPlaygroundSurface.vue";

type UseClickEvent = "click" | "mousedown";
type UseClickOutsideEvent = "pointerdown" | "mousedown" | "click";
type UseClickOutsideHandlerMode =
  | "default"
  | "custom-close"
  | "custom-keep-open";
type LogTone = "neutral" | "success" | "warning";

interface PlaygroundControls {
  enabled: boolean;
  event: UseClickEvent;
  toggle: boolean;
  ignoreMouse: boolean;
  ignoreKeyboard: boolean;
  ignoreTouch: boolean;
  closeOnOutsideClick: boolean;
  outsideEvent: UseClickOutsideEvent;
  outsideCapture: boolean;
  ignoreScrollbar: boolean;
  ignoreDrag: boolean;
  outsideHandlerMode: UseClickOutsideHandlerMode;
}

interface PlaygroundTelemetry {
  open: boolean;
  lastReason: string;
  lastEventType: string;
  placement: string;
  x: number;
  y: number;
  isPositioned: boolean;
}

interface LogEntry {
  id: number;
  time: string;
  tone: LogTone;
  title: string;
  detail: string;
}

interface Preset {
  id: string;
  label: string;
  description: string;
  values: Partial<PlaygroundControls>;
}

const presets: Preset[] = [
  {
    id: "dropdown",
    label: "Dropdown",
    description: "Balanced defaults for a normal anchored menu.",
    values: {
      event: "click",
      toggle: true,
      closeOnOutsideClick: true,
      outsideEvent: "pointerdown",
      outsideCapture: true,
      outsideHandlerMode: "default",
    },
  },
  {
    id: "press-first",
    label: "Press First",
    description: "Open on press for the fastest feedback path.",
    values: {
      event: "mousedown",
      toggle: true,
      closeOnOutsideClick: true,
      outsideEvent: "mousedown",
      outsideCapture: true,
      outsideHandlerMode: "default",
    },
  },
  {
    id: "keyboard-lab",
    label: "Keyboard Lab",
    description: "Ignore mouse and exercise Enter or Space activation.",
    values: {
      ignoreMouse: true,
      ignoreKeyboard: false,
      closeOnOutsideClick: true,
      outsideEvent: "click",
      outsideCapture: false,
      outsideHandlerMode: "default",
    },
  },
  {
    id: "custom-guard",
    label: "Custom Guard",
    description: "Intercept outside clicks and keep the layer open.",
    values: {
      closeOnOutsideClick: true,
      outsideEvent: "click",
      outsideCapture: true,
      ignoreDrag: true,
      outsideHandlerMode: "custom-keep-open",
    },
  },
];

function createDefaultControls(): PlaygroundControls {
  return {
    enabled: true,
    event: "click",
    toggle: true,
    ignoreMouse: false,
    ignoreKeyboard: false,
    ignoreTouch: false,
    closeOnOutsideClick: true,
    outsideEvent: "pointerdown",
    outsideCapture: true,
    ignoreScrollbar: true,
    ignoreDrag: true,
    outsideHandlerMode: "default",
  };
}

const controls = reactive(createDefaultControls());

const telemetry = reactive<PlaygroundTelemetry>({
  open: false,
  lastReason: "none",
  lastEventType: "none",
  placement: "bottom-start",
  x: 0,
  y: 0,
  isPositioned: false,
});

const logs = ref<LogEntry[]>([]);
const logCounter = ref(0);

const surfaceKey = computed(
  () => `use-click-surface-${controls.outsideHandlerMode}`,
);

const activeSummary = computed(() => {
  const tags = [controls.enabled ? "enabled" : "disabled"];

  tags.push(controls.toggle ? "toggle mode" : "open-only mode");
  tags.push(
    controls.closeOnOutsideClick
      ? "outside dismissal on"
      : "outside dismissal off",
  );
  tags.push(controls.outsideCapture ? "capture phase" : "bubble phase");
  tags.push(
    controls.outsideHandlerMode === "default"
      ? "default outside handler"
      : controls.outsideHandlerMode === "custom-close"
        ? "custom close handler"
        : "custom keep-open handler",
  );

  if (controls.ignoreMouse) tags.push("mouse ignored");
  if (controls.ignoreKeyboard) tags.push("keyboard ignored");
  if (controls.ignoreTouch) tags.push("touch ignored");

  return tags;
});

const codeSnippet = computed(() => {
  const optionLines = [
    `event: "${controls.event}"`,
    `toggle: ${controls.toggle}`,
    `enabled: ${controls.enabled}`,
    `ignoreMouse: ${controls.ignoreMouse}`,
    `ignoreKeyboard: ${controls.ignoreKeyboard}`,
    `ignoreTouch: ${controls.ignoreTouch}`,
    `closeOnOutsideClick: ${controls.closeOnOutsideClick}`,
    `outsideEvent: "${controls.outsideEvent}"`,
    `outsideCapture: ${controls.outsideCapture}`,
    `ignoreScrollbar: ${controls.ignoreScrollbar}`,
    `ignoreDrag: ${controls.ignoreDrag}`,
  ];

  if (controls.outsideHandlerMode === "custom-close") {
    optionLines.push("onOutsideClick: (event) => {");
    optionLines.push('  context.setOpen(false, "outside-pointer", event)');
    optionLines.push("}");
  }

  if (controls.outsideHandlerMode === "custom-keep-open") {
    optionLines.push("onOutsideClick: () => {");
    optionLines.push(
      "  // Keep the layer open while logging or gating dismissal.",
    );
    optionLines.push("}");
  }

  return `const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
  middlewares: [offset(14), flip({ padding: 16 }), shift({ padding: 16 })],
})

useClick(context, {
  ${optionLines.join(",\n  ")}
})`;
});

function pushLog(entry: Omit<LogEntry, "id" | "time">) {
  logCounter.value += 1;

  logs.value = [
    {
      id: logCounter.value,
      time: new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date()),
      ...entry,
    },
    ...logs.value,
  ].slice(0, 18);
}

function handleSurfaceLog(entry: {
  tone: LogTone;
  title: string;
  detail: string;
}) {
  pushLog(entry);
}

function updateTelemetry(next: PlaygroundTelemetry) {
  Object.assign(telemetry, next);
}

function applyPreset(preset: Preset) {
  Object.assign(controls, createDefaultControls(), preset.values);
  pushLog({
    tone: "success",
    title: `Preset applied: ${preset.label}`,
    detail: preset.description,
  });
}

function resetControls() {
  Object.assign(controls, createDefaultControls());
  pushLog({
    tone: "neutral",
    title: "Controls reset",
    detail:
      "Returned the playground to its baseline dropdown-oriented defaults.",
  });
}

function clearLog() {
  logs.value = [];
}

onMounted(() => {
  pushLog({
    tone: "neutral",
    title: "useClick playground ready",
    detail:
      "Start with the trigger, then use the outside tiles and inspector to verify behavior.",
  });
});
</script>

<template>
  <div class="use-click-playground">
    <header class="hero-panel">
      <div class="hero-copy">
        <p class="hero-eyebrow">VFloat Playground</p>
        <h1>Comprehensive useClick test bench</h1>
        <p class="hero-description">
          A polished interaction lab for validating inside clicks, keyboard
          activation, outside dismissal, capture-phase behavior, scrollbar
          handling, drag suppression, and custom outside click logic.
        </p>
      </div>

      <div class="hero-side">
        <div class="hero-metric">
          <span>open state</span>
          <strong>{{ telemetry.open ? "open" : "closed" }}</strong>
        </div>
        <div class="hero-metric">
          <span>latest reason</span>
          <strong>{{ telemetry.lastReason }}</strong>
        </div>
        <div class="hero-metric">
          <span>outside mode</span>
          <strong>{{ controls.outsideHandlerMode }}</strong>
        </div>
      </div>
    </header>

    <div class="workspace-grid">
      <aside class="panel control-panel">
        <div class="section-head">
          <p class="section-kicker">Scenarios</p>
          <h2>Quick presets</h2>
        </div>

        <div class="preset-stack">
          <button
            v-for="preset in presets"
            :key="preset.id"
            type="button"
            class="preset-button"
            @click="applyPreset(preset)"
          >
            <strong>{{ preset.label }}</strong>
            <span>{{ preset.description }}</span>
          </button>
        </div>

        <div class="section-head">
          <p class="section-kicker">Inside trigger</p>
          <h2>Activation rules</h2>
        </div>

        <div class="segmented-grid">
          <button
            v-for="value in ['click', 'mousedown']"
            :key="value"
            type="button"
            class="segmented-button"
            :data-active="controls.event === value"
            @click="controls.event = value as UseClickEvent"
          >
            {{ value }}
          </button>
        </div>

        <label class="toggle-row">
          <span>
            <strong>Enabled</strong>
            <small
              >Turn the composable on or off without unmounting the
              surface.</small
            >
          </span>
          <input v-model="controls.enabled" type="checkbox" />
        </label>

        <label class="toggle-row">
          <span>
            <strong>Toggle</strong>
            <small
              >Repeated anchor activation closes when this is enabled.</small
            >
          </span>
          <input v-model="controls.toggle" type="checkbox" />
        </label>

        <div class="section-head">
          <p class="section-kicker">Filtering</p>
          <h2>Input suppression</h2>
        </div>

        <label class="toggle-row">
          <span>
            <strong>Ignore mouse</strong>
            <small>Useful for keyboard-only or context-menu-like setups.</small>
          </span>
          <input v-model="controls.ignoreMouse" type="checkbox" />
        </label>

        <label class="toggle-row">
          <span>
            <strong>Ignore keyboard</strong>
            <small>Disables Enter and Space activation on the anchor.</small>
          </span>
          <input v-model="controls.ignoreKeyboard" type="checkbox" />
        </label>

        <label class="toggle-row">
          <span>
            <strong>Ignore touch</strong>
            <small
              >Best verified on a touch device or with touch emulation.</small
            >
          </span>
          <input v-model="controls.ignoreTouch" type="checkbox" />
        </label>

        <div class="section-head">
          <p class="section-kicker">Outside handling</p>
          <h2>Dismissal strategy</h2>
        </div>

        <label class="toggle-row">
          <span>
            <strong>Close on outside click</strong>
            <small
              >Document-level dismissal for targets outside anchor and
              floating.</small
            >
          </span>
          <input v-model="controls.closeOnOutsideClick" type="checkbox" />
        </label>

        <div class="segmented-grid segmented-grid--triple">
          <button
            v-for="value in ['pointerdown', 'mousedown', 'click']"
            :key="value"
            type="button"
            class="segmented-button"
            :data-active="controls.outsideEvent === value"
            @click="controls.outsideEvent = value as UseClickOutsideEvent"
          >
            {{ value }}
          </button>
        </div>

        <label class="toggle-row">
          <span>
            <strong>Use capture phase</strong>
            <small
              >Try the propagation breaker tile to see the difference
              immediately.</small
            >
          </span>
          <input v-model="controls.outsideCapture" type="checkbox" />
        </label>

        <label class="toggle-row">
          <span>
            <strong>Ignore scrollbar</strong>
            <small
              >Prevents scrollbar interactions inside the floating panel from
              dismissing.</small
            >
          </span>
          <input v-model="controls.ignoreScrollbar" type="checkbox" />
        </label>

        <label class="toggle-row">
          <span>
            <strong>Ignore drag</strong>
            <small
              >Most relevant when the outside event is configured to
              <code>click</code>.</small
            >
          </span>
          <input v-model="controls.ignoreDrag" type="checkbox" />
        </label>

        <div class="section-head">
          <p class="section-kicker">Custom callback</p>
          <h2>onOutsideClick mode</h2>
        </div>

        <div class="handler-grid">
          <button
            type="button"
            class="handler-button"
            :data-active="controls.outsideHandlerMode === 'default'"
            @click="controls.outsideHandlerMode = 'default'"
          >
            <strong>Default</strong>
            <span>Use the built-in dismissal path.</span>
          </button>

          <button
            type="button"
            class="handler-button"
            :data-active="controls.outsideHandlerMode === 'custom-close'"
            @click="controls.outsideHandlerMode = 'custom-close'"
          >
            <strong>Custom close</strong>
            <span>Dismiss through your own callback.</span>
          </button>

          <button
            type="button"
            class="handler-button"
            :data-active="controls.outsideHandlerMode === 'custom-keep-open'"
            @click="controls.outsideHandlerMode = 'custom-keep-open'"
          >
            <strong>Custom keep-open</strong>
            <span>Intercept outside clicks without dismissing.</span>
          </button>
        </div>

        <button type="button" class="reset-button" @click="resetControls">
          Reset controls
        </button>
      </aside>

      <main class="panel surface-panel">
        <UseClickPlaygroundSurface
          :key="surfaceKey"
          :controls="controls"
          @log="handleSurfaceLog"
          @state-change="updateTelemetry"
        />
      </main>

      <aside class="panel inspector-panel">
        <div class="section-head">
          <p class="section-kicker">Inspector</p>
          <h2>Live telemetry</h2>
        </div>

        <div class="telemetry-grid">
          <div class="telemetry-card">
            <span>open</span>
            <strong>{{ telemetry.open ? "true" : "false" }}</strong>
          </div>
          <div class="telemetry-card">
            <span>reason</span>
            <strong>{{ telemetry.lastReason }}</strong>
          </div>
          <div class="telemetry-card">
            <span>event</span>
            <strong>{{ telemetry.lastEventType }}</strong>
          </div>
          <div class="telemetry-card">
            <span>placement</span>
            <strong>{{ telemetry.placement }}</strong>
          </div>
          <div class="telemetry-card">
            <span>x</span>
            <strong>{{ Math.round(telemetry.x) }}</strong>
          </div>
          <div class="telemetry-card">
            <span>y</span>
            <strong>{{ Math.round(telemetry.y) }}</strong>
          </div>
        </div>

        <div class="section-head">
          <p class="section-kicker">Summary</p>
          <h2>Current profile</h2>
        </div>

        <div class="summary-pills">
          <span v-for="tag in activeSummary" :key="tag" class="summary-chip">{{
            tag
          }}</span>
        </div>

        <div class="section-head">
          <p class="section-kicker">Code shape</p>
          <h2>Generated config</h2>
        </div>

        <pre class="code-block"><code>{{ codeSnippet }}</code></pre>

        <div class="log-header">
          <div class="section-head section-head--tight">
            <p class="section-kicker">Trace</p>
            <h2>Event log</h2>
          </div>

          <button type="button" class="clear-button" @click="clearLog">
            Clear
          </button>
        </div>

        <div class="log-stream">
          <article
            v-for="entry in logs"
            :key="entry.id"
            class="log-entry"
            :data-tone="entry.tone"
          >
            <div class="log-entry__meta">
              <strong>{{ entry.title }}</strong>
              <span>{{ entry.time }}</span>
            </div>
            <p>{{ entry.detail }}</p>
          </article>
        </div>
      </aside>
    </div>

    <section class="note-band">
      <article class="note-card">
        <p class="section-kicker">Capture check</p>
        <h3>Propagation breaker</h3>
        <p>
          Set <code>outsideCapture</code> to false, open the layer, then press
          the propagation breaker. It should stop dismissing because the event
          never reaches the document in the bubble phase.
        </p>
      </article>

      <article class="note-card">
        <p class="section-kicker">Drag check</p>
        <h3>Release outside after dragging</h3>
        <p>
          Switch <code>outsideEvent</code> to <code>click</code>. With
          <code>ignoreDrag</code> enabled, a drag sequence that starts inside
          the floating panel should not dismiss it when the release happens
          outside.
        </p>
      </article>

      <article class="note-card">
        <p class="section-kicker">Input check</p>
        <h3>Keyboard and touch filters</h3>
        <p>
          Focus the anchor and use Enter or Space to confirm keyboard
          activation. If you need to validate <code>ignoreTouch</code>, run the
          playground on a touch device or emulator.
        </p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.use-click-playground {
  --playground-ink: #173332;
  --playground-subtle: #5c716f;
  --playground-line: rgba(19, 66, 64, 0.12);
  --playground-accent: #0b7e76;
  --playground-accent-soft: rgba(11, 126, 118, 0.1);
  --playground-panel: rgba(255, 255, 255, 0.82);
  min-height: 100vh;
  padding: clamp(1rem, 2vw, 1.75rem);
  background:
    radial-gradient(
      circle at top left,
      rgba(20, 184, 166, 0.18),
      transparent 28%
    ),
    radial-gradient(
      circle at top right,
      rgba(251, 191, 36, 0.14),
      transparent 24%
    ),
    linear-gradient(180deg, #f3f7f5 0%, #eef4f1 48%, #f9faf8 100%);
  color: var(--playground-ink);
  font-family: "Aptos", "Segoe UI Variable Text", sans-serif;
}

.hero-panel,
.panel,
.note-card {
  border: 1px solid var(--playground-line);
  border-radius: 1.8rem;
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.9),
      rgba(249, 252, 251, 0.88)
    ),
    var(--playground-panel);
  box-shadow:
    0 24px 60px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(18px);
}

.hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(18rem, 0.8fr);
  gap: 1.5rem;
  padding: clamp(1.25rem, 2vw, 2rem);
  margin-bottom: 1.25rem;
}

.hero-eyebrow,
.section-kicker {
  margin: 0;
  color: var(--playground-accent);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 0.74rem;
  font-weight: 700;
}

.hero-copy h1 {
  margin: 0.35rem 0 0;
  font-family: "Bahnschrift SemiCondensed", "Aptos Display", sans-serif;
  font-size: clamp(2rem, 4.1vw, 3.6rem);
  line-height: 0.95;
}

.hero-description {
  max-width: 58ch;
  margin: 1rem 0 0;
  color: var(--playground-subtle);
  line-height: 1.65;
  font-size: 1.02rem;
}

.hero-side {
  display: grid;
  gap: 0.75rem;
}

.hero-metric,
.telemetry-card,
.preset-button,
.toggle-row,
.handler-button,
.log-entry {
  border-radius: 1.15rem;
  border: 1px solid var(--playground-line);
  background: rgba(255, 255, 255, 0.8);
}

.hero-metric {
  display: grid;
  gap: 0.3rem;
  padding: 1rem;
}

.hero-metric span,
.telemetry-card span,
.toggle-row small {
  color: #748885;
}

.hero-metric strong,
.telemetry-card strong,
.preset-button strong,
.toggle-row strong,
.handler-button strong {
  color: var(--playground-ink);
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(17rem, 22rem) minmax(0, 1fr) minmax(
      19rem,
      24rem
    );
  gap: 1rem;
  align-items: start;
}

.panel {
  padding: 1.15rem;
}

.control-panel,
.inspector-panel {
  display: grid;
  gap: 1rem;
}

.section-head {
  display: grid;
  gap: 0.2rem;
}

.section-head h2,
.note-card h3 {
  margin: 0;
  font-family: "Bahnschrift SemiCondensed", "Aptos Display", sans-serif;
  font-size: 1.2rem;
}

.section-head--tight h2 {
  font-size: 1.05rem;
}

.preset-stack,
.handler-grid,
.summary-pills {
  display: grid;
  gap: 0.75rem;
}

.preset-button,
.handler-button,
.segmented-button,
.reset-button,
.clear-button {
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.preset-button,
.handler-button {
  display: grid;
  gap: 0.28rem;
  padding: 0.95rem 1rem;
  text-align: left;
  cursor: pointer;
}

.preset-button span,
.handler-button span,
.note-card p,
.toggle-row small,
.log-entry p {
  line-height: 1.55;
  color: var(--playground-subtle);
}

.preset-button:hover,
.handler-button:hover,
.segmented-button:hover,
.reset-button:hover,
.clear-button:hover {
  transform: translateY(-1px);
  border-color: rgba(11, 126, 118, 0.28);
}

.segmented-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.segmented-grid--triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.segmented-button {
  padding: 0.8rem 0.95rem;
  border: 1px solid var(--playground-line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  color: #355452;
  cursor: pointer;
  font-weight: 700;
}

.segmented-button[data-active="true"],
.handler-button[data-active="true"] {
  background: rgba(226, 252, 247, 0.96);
  border-color: rgba(11, 126, 118, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  gap: 0.9rem;
  align-items: flex-start;
  padding: 0.95rem 1rem;
}

.toggle-row span {
  display: grid;
  gap: 0.24rem;
}

.toggle-row input {
  width: 1.15rem;
  height: 1.15rem;
  margin-top: 0.15rem;
  accent-color: var(--playground-accent);
}

.toggle-row code,
.note-card code {
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  background: var(--playground-accent-soft);
  color: #174b49;
}

.reset-button,
.clear-button {
  border: 1px solid var(--playground-line);
  cursor: pointer;
  font-weight: 700;
}

.reset-button {
  padding: 0.9rem 1rem;
  border-radius: 999px;
  background: #174b49;
  color: #f4fbfb;
}

.surface-panel {
  min-height: 100%;
}

.telemetry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.telemetry-card {
  display: grid;
  gap: 0.25rem;
  padding: 0.95rem 1rem;
}

.summary-pills {
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
}

.summary-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.68rem 0.85rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid var(--playground-line);
  color: #31514f;
  font-size: 0.84rem;
  font-weight: 700;
}

.code-block {
  margin: 0;
  padding: 1rem;
  overflow: auto;
  border-radius: 1.25rem;
  border: 1px solid rgba(13, 40, 47, 0.08);
  background:
    linear-gradient(180deg, rgba(12, 31, 46, 0.98), rgba(17, 45, 48, 0.98)),
    #10242c;
  color: #dbf6f3;
  font-size: 0.84rem;
  line-height: 1.65;
}

.log-header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.clear-button {
  padding: 0.65rem 0.9rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: #214140;
}

.log-stream {
  display: grid;
  gap: 0.75rem;
}

.log-entry {
  padding: 0.9rem 1rem;
}

.log-entry[data-tone="success"] {
  border-color: rgba(11, 126, 118, 0.22);
  background: rgba(232, 253, 249, 0.72);
}

.log-entry[data-tone="warning"] {
  border-color: rgba(213, 145, 24, 0.26);
  background: rgba(253, 246, 226, 0.78);
}

.log-entry__meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: baseline;
}

.log-entry__meta span {
  color: #859692;
  font-size: 0.8rem;
}

.log-entry p {
  margin: 0.45rem 0 0;
}

.note-band {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.note-card {
  padding: 1.15rem;
}

.note-card p {
  margin: 0.55rem 0 0;
}

@media (max-width: 1200px) {
  .workspace-grid {
    grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
  }

  .inspector-panel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 960px) {
  .hero-panel,
  .workspace-grid,
  .note-band {
    grid-template-columns: 1fr;
  }

  .hero-side,
  .telemetry-grid,
  .summary-pills {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .use-click-playground {
    padding: 0.85rem;
  }

  .hero-panel,
  .panel,
  .note-card {
    border-radius: 1.3rem;
  }

  .hero-side,
  .telemetry-grid,
  .summary-pills,
  .note-band {
    grid-template-columns: 1fr;
  }

  .segmented-grid--triple {
    grid-template-columns: 1fr;
  }
}
</style>
