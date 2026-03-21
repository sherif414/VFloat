<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue";
import { flip, offset, shift, useClick, useFloating } from "../../src";
import type { OpenChangeReason } from "../../src/types";

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

interface PlaygroundLogEvent {
  tone: LogTone;
  title: string;
  detail: string;
}

interface PlaygroundTelemetry {
  open: boolean;
  lastReason: OpenChangeReason | "none";
  lastEventType: string;
  placement: string;
  x: number;
  y: number;
  isPositioned: boolean;
}

const props = defineProps<{
  controls: PlaygroundControls;
}>();

const emit = defineEmits<{
  log: [entry: PlaygroundLogEvent];
  "state-change": [state: PlaygroundTelemetry];
}>();

const anchorEl = useTemplateRef("anchorEl");
const floatingEl = useTemplateRef("floatingEl");

const open = ref(false);
const lastReason = ref<OpenChangeReason | "none">("none");
const lastEventType = ref("none");

const context = useFloating(anchorEl, floatingEl, {
  open,
  placement: "bottom-start",
  middlewares: [offset(14), flip({ padding: 16 }), shift({ padding: 16 })],
  onOpenChange(nextOpen, reason, event) {
    lastReason.value = reason;
    lastEventType.value = event?.type ?? "programmatic";

    emitLog(
      nextOpen ? "success" : "warning",
      nextOpen ? "Floating opened" : "Floating closed",
      `${reason} via ${lastEventType.value}`,
    );
  },
});

const outsideHandler =
  props.controls.outsideHandlerMode === "default"
    ? undefined
    : (event: MouseEvent) => {
        if (props.controls.outsideHandlerMode === "custom-keep-open") {
          emitLog(
            "warning",
            "Custom outside handler intercepted dismissal",
            "The outside click was observed, but the floating layer stayed open.",
          );
          return;
        }

        emitLog(
          "neutral",
          "Custom outside handler ran",
          "Dismissal was delegated to the supplied onOutsideClick callback.",
        );
        context.setOpen(false, "outside-pointer", event);
      };

useClick(context, {
  enabled: () => props.controls.enabled,
  event: () => props.controls.event,
  toggle: () => props.controls.toggle,
  ignoreMouse: () => props.controls.ignoreMouse,
  ignoreKeyboard: () => props.controls.ignoreKeyboard,
  ignoreTouch: () => props.controls.ignoreTouch,
  closeOnOutsideClick: () => props.controls.closeOnOutsideClick,
  outsideEvent: () => props.controls.outsideEvent,
  outsideCapture: () => props.controls.outsideCapture,
  ignoreScrollbar: () => props.controls.ignoreScrollbar,
  ignoreDrag: () => props.controls.ignoreDrag,
  onOutsideClick: outsideHandler,
});

watch(
  [
    open,
    lastReason,
    lastEventType,
    context.placement,
    context.x,
    context.y,
    context.isPositioned,
  ],
  () => {
    emit("state-change", {
      open: open.value,
      lastReason: lastReason.value,
      lastEventType: lastEventType.value,
      placement: context.placement.value,
      x: context.x.value,
      y: context.y.value,
      isPositioned: context.isPositioned.value,
    });
  },
  { immediate: true },
);

const dragHintActive = computed(
  () =>
    props.controls.closeOnOutsideClick &&
    props.controls.outsideEvent === "click",
);

const interactionLabels = computed(() => {
  const labels = [
    props.controls.ignoreMouse ? "mouse ignored" : "mouse active",
    props.controls.ignoreKeyboard ? "keyboard ignored" : "keyboard active",
  ];

  labels.push(props.controls.toggle ? "toggle on repeat click" : "open only");

  if (props.controls.closeOnOutsideClick) {
    labels.push(`outside closes on ${props.controls.outsideEvent}`);
  } else {
    labels.push("outside dismissal disabled");
  }

  return labels;
});

const floatingActions = [
  "Open docs workspace",
  "Rename anchor contract",
  "Inspect pointer history",
  "Export event trace",
  "Review nested menu state",
  "Pin current scenario",
  "Invite keyboard fallback",
  "Simulate touch audit",
  "Validate dismissal path",
  "Bookmark this preset",
];

function emitLog(tone: LogTone, title: string, detail: string) {
  emit("log", { tone, title, detail });
}

function onAnchorPointerDown(event: PointerEvent) {
  emitLog("neutral", "Anchor pointerdown", `pointerType=${event.pointerType}`);
}

function onAnchorMouseDown() {
  emitLog(
    "neutral",
    "Anchor mousedown",
    props.controls.event === "mousedown"
      ? "This is the active inside trigger."
      : "This precedes the configured click trigger.",
  );
}

function onAnchorClick() {
  emitLog(
    "neutral",
    "Anchor click",
    props.controls.event === "click"
      ? "This is the active inside trigger."
      : "The click follows the earlier mousedown trigger.",
  );
}

function onAnchorKeyDown(event: KeyboardEvent) {
  if (event.key !== "Enter" && event.key !== " ") return;
  emitLog(
    "neutral",
    "Anchor keydown",
    event.key === "Enter"
      ? "Enter was pressed while the trigger was focused."
      : "Space was pressed. useClick prevents scrolling when applicable.",
  );
}

function onAnchorKeyUp(event: KeyboardEvent) {
  if (event.key !== "Enter" && event.key !== " ") return;
  emitLog(
    "neutral",
    "Anchor keyup",
    event.key === "Enter"
      ? "Enter was released."
      : "Space was released. This is where Space activation completes.",
  );
}

function logOutsideZone(name: string) {
  emitLog(
    "neutral",
    name,
    "This target sits outside both the anchor and floating elements.",
  );
}

function logPropagationBlocker() {
  emitLog(
    "neutral",
    "Propagation breaker pressed",
    props.controls.outsideCapture
      ? "Capture listeners can still react before bubbling is stopped here."
      : "Bubble-phase outside listeners are blocked by this target.",
  );
}

function logFloatingAction(item: string) {
  emitLog(
    "neutral",
    `Floating action: ${item}`,
    "Clicks inside the floating element should not count as outside dismissal.",
  );
}

function refreshPosition() {
  context.update();
  emitLog(
    "neutral",
    "Manual position refresh",
    "The floating coordinates were recomputed on demand.",
  );
}

function closeFromPanel() {
  if (!open.value) {
    emitLog(
      "neutral",
      "Floating already closed",
      "The close control had nothing to dismiss.",
    );
    return;
  }

  context.setOpen(false, "programmatic");
}
</script>

<template>
  <section class="surface-shell">
    <header class="surface-header">
      <div class="surface-copy">
        <p class="surface-eyebrow">Live Interaction Bench</p>
        <h2>
          Drive real click flows through the composable, not a mocked control
          panel.
        </h2>
        <p class="surface-description">
          Focus the trigger and use Enter or Space, try the propagation breaker,
          then switch the outside event to <code>click</code> to study drag
          suppression.
        </p>
      </div>

      <div class="surface-status">
        <span class="status-pill" :data-open="open">
          {{ open ? "Open" : "Closed" }}
        </span>
        <span class="mode-pill">{{ props.controls.event }} trigger</span>
        <span class="mode-pill">{{ props.controls.outsideEvent }} outside</span>
      </div>
    </header>

    <div class="stage-shell">
      <div class="trigger-bank">
        <div class="trigger-copy">
          <span class="label-tag">Anchor</span>
          <h3>Command launcher</h3>
          <p>
            This button is the reference element for
            <code>useFloating</code> and the input surface for
            <code>useClick</code>.
          </p>
        </div>

        <button
          ref="anchorEl"
          type="button"
          class="anchor-button"
          @pointerdown="onAnchorPointerDown"
          @mousedown="onAnchorMouseDown"
          @click="onAnchorClick"
          @keydown="onAnchorKeyDown"
          @keyup="onAnchorKeyUp"
        >
          <span class="anchor-button__eyebrow">Precision trigger</span>
          <span class="anchor-button__title">Launch interaction layer</span>
          <span class="anchor-button__caption">
            {{
              props.controls.toggle
                ? "Repeating the same trigger will toggle."
                : "Repeat clicks only reopen."
            }}
          </span>
        </button>

        <div class="label-row">
          <span
            v-for="label in interactionLabels"
            :key="label"
            class="summary-pill"
            >{{ label }}</span
          >
        </div>
      </div>

      <div class="outside-grid">
        <button
          type="button"
          class="outside-tile"
          @click="logOutsideZone('Outside quiet zone')"
        >
          <span class="outside-tile__eyebrow">Outside target</span>
          <strong>Quiet zone</strong>
          <span>Use this as a normal dismissal surface.</span>
        </button>

        <button
          type="button"
          class="outside-tile outside-tile--breaker"
          @pointerdown.stop="logPropagationBlocker"
          @mousedown.stop="logPropagationBlocker"
          @click.stop="logPropagationBlocker"
        >
          <span class="outside-tile__eyebrow">Capture test</span>
          <strong>Propagation breaker</strong>
          <span
            >Stops bubbling so you can compare capture=true vs
            capture=false.</span
          >
        </button>

        <button
          type="button"
          class="outside-tile outside-tile--accent"
          @click="logOutsideZone('Outside action zone')"
        >
          <span class="outside-tile__eyebrow">Dismissal lane</span>
          <strong>Action zone</strong>
          <span
            >Helpful when you want a bigger outside surface to click on.</span
          >
        </button>
      </div>
    </div>

    <footer class="surface-footer">
      <div class="footer-stat">
        <span class="footer-stat__label">Mouse</span>
        <strong>{{ props.controls.ignoreMouse ? "Ignored" : "Active" }}</strong>
      </div>
      <div class="footer-stat">
        <span class="footer-stat__label">Keyboard</span>
        <strong>{{
          props.controls.ignoreKeyboard ? "Ignored" : "Active"
        }}</strong>
      </div>
      <div class="footer-stat">
        <span class="footer-stat__label">Outside handler</span>
        <strong>{{ props.controls.outsideHandlerMode }}</strong>
      </div>
      <div class="footer-note">
        {{
          dragHintActive
            ? "Drag test is active. Press inside the floating panel, drag out, then release."
            : "Set outsideEvent to click to test drag suppression with ignoreDrag."
        }}
      </div>
    </footer>

    <Teleport to="body">
      <div
        v-if="open"
        ref="floatingEl"
        class="floating-panel"
        :style="context.floatingStyles.value"
      >
        <div class="floating-panel__header">
          <div>
            <p class="floating-panel__eyebrow">Floating surface</p>
            <h3>useClick diagnostics drawer</h3>
          </div>

          <button
            type="button"
            class="floating-panel__close"
            @click="closeFromPanel"
          >
            Close
          </button>
        </div>

        <div class="floating-meta">
          <span>placement {{ context.placement.value }}</span>
          <span>x {{ Math.round(context.x.value) }}</span>
          <span>y {{ Math.round(context.y.value) }}</span>
        </div>

        <div class="drag-probe">
          <strong>Drag probe</strong>
          <p>
            Press anywhere in this panel, drag the pointer outside, and release.
            When
            <code>outsideEvent</code> is <code>click</code>,
            <code>ignoreDrag</code> decides whether that release should dismiss.
          </p>
        </div>

        <div class="scroll-well">
          <button
            v-for="item in floatingActions"
            :key="item"
            type="button"
            class="floating-action"
            @click="logFloatingAction(item)"
          >
            <span>{{ item }}</span>
            <small>inside click</small>
          </button>
        </div>

        <div class="floating-panel__footer">
          <button
            type="button"
            class="floating-secondary"
            @click="refreshPosition"
          >
            Refresh position
          </button>
          <p class="floating-help">
            Scroll this panel to test <code>ignoreScrollbar</code>.
          </p>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.surface-shell {
  display: grid;
  gap: 1.5rem;
}

.surface-header,
.stage-shell,
.surface-footer {
  border: 1px solid rgba(19, 66, 64, 0.12);
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.98),
      rgba(244, 248, 247, 0.98)
    ),
    rgba(255, 255, 255, 0.98);
  border-radius: 1.6rem;
  box-shadow:
    0 22px 50px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.surface-header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.5rem;
}

.surface-copy h2 {
  margin: 0.25rem 0 0;
  font-family: "Bahnschrift SemiCondensed", "Aptos Display", sans-serif;
  font-size: clamp(1.55rem, 2vw, 2rem);
  line-height: 1.05;
  color: #163635;
}

.surface-description {
  max-width: 58ch;
  margin: 0.85rem 0 0;
  color: #526765;
  line-height: 1.6;
}

.surface-description code,
.drag-probe code,
.floating-help code {
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  background: rgba(19, 66, 64, 0.08);
  color: #174b49;
}

.surface-eyebrow,
.floating-panel__eyebrow {
  margin: 0;
  color: #0b7e76;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 0.74rem;
  font-weight: 700;
}

.surface-status {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  justify-content: flex-end;
  gap: 0.65rem;
  min-width: 12rem;
}

.status-pill,
.mode-pill,
.summary-pill,
.floating-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.status-pill {
  background: rgba(19, 66, 64, 0.08);
  color: #355452;
}

.status-pill[data-open="true"] {
  background: rgba(11, 126, 118, 0.14);
  color: #0e635d;
}

.mode-pill,
.summary-pill,
.floating-meta span {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(19, 66, 64, 0.1);
  color: #30504e;
}

.stage-shell {
  display: grid;
  gap: 1.15rem;
  padding: 1.4rem;
  background:
    radial-gradient(
      circle at top left,
      rgba(44, 185, 167, 0.12),
      transparent 35%
    ),
    linear-gradient(
      180deg,
      rgba(252, 253, 252, 0.98),
      rgba(241, 247, 245, 0.98)
    );
}

.trigger-bank {
  display: grid;
  gap: 1rem;
  padding: 1.2rem;
  border-radius: 1.3rem;
  background:
    linear-gradient(145deg, rgba(10, 35, 52, 0.98), rgba(19, 66, 64, 0.95)),
    #0f2f39;
  color: #eef6f5;
}

.trigger-copy h3 {
  margin: 0.3rem 0 0;
  font-size: 1.3rem;
}

.trigger-copy p {
  margin: 0.45rem 0 0;
  max-width: 52ch;
  color: rgba(236, 247, 246, 0.78);
  line-height: 1.55;
}

.label-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.38rem 0.65rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #94efe7;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.7rem;
  font-weight: 700;
}

.anchor-button {
  display: grid;
  gap: 0.4rem;
  width: min(100%, 24rem);
  padding: 1.3rem 1.35rem;
  border: 0;
  border-radius: 1.35rem;
  background:
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.98),
      rgba(235, 252, 248, 0.94)
    ),
    #ffffff;
  color: #173332;
  text-align: left;
  cursor: pointer;
  box-shadow:
    0 24px 44px rgba(5, 19, 31, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.anchor-button:hover {
  transform: translateY(-2px);
  box-shadow:
    0 28px 50px rgba(5, 19, 31, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.anchor-button:focus-visible,
.outside-tile:focus-visible,
.floating-panel__close:focus-visible,
.floating-secondary:focus-visible,
.floating-action:focus-visible {
  outline: 3px solid rgba(67, 215, 195, 0.4);
  outline-offset: 3px;
}

.anchor-button__eyebrow {
  color: #0c8f85;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.anchor-button__title {
  font-family: "Bahnschrift SemiCondensed", "Aptos Display", sans-serif;
  font-size: 1.3rem;
}

.anchor-button__caption {
  color: #55726f;
  line-height: 1.5;
}

.label-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.outside-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.outside-tile {
  display: grid;
  gap: 0.35rem;
  min-height: 10.5rem;
  padding: 1.2rem;
  border: 1px solid rgba(19, 66, 64, 0.12);
  border-radius: 1.3rem;
  background: rgba(255, 255, 255, 0.86);
  color: #204140;
  text-align: left;
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.outside-tile:hover {
  transform: translateY(-2px);
  border-color: rgba(11, 126, 118, 0.32);
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
}

.outside-tile--breaker {
  background:
    linear-gradient(
      180deg,
      rgba(251, 247, 239, 0.98),
      rgba(250, 241, 220, 0.88)
    ),
    #fef7e8;
}

.outside-tile--accent {
  background:
    linear-gradient(
      180deg,
      rgba(232, 253, 249, 0.96),
      rgba(215, 246, 240, 0.9)
    ),
    #e8faf6;
}

.outside-tile__eyebrow {
  color: #68817e;
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
}

.outside-tile strong {
  font-family: "Bahnschrift SemiCondensed", "Aptos Display", sans-serif;
  font-size: 1.08rem;
}

.outside-tile span:last-child {
  color: #59716f;
  line-height: 1.55;
}

.surface-footer {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, max-content)) minmax(0, 1fr);
  gap: 0.85rem 1rem;
  align-items: center;
  padding: 1rem 1.2rem;
}

.footer-stat {
  display: grid;
  gap: 0.2rem;
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(19, 66, 64, 0.1);
}

.footer-stat__label {
  color: #758986;
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
}

.footer-stat strong {
  color: #173a38;
}

.footer-note {
  color: #4e6664;
  line-height: 1.55;
}

.floating-panel {
  z-index: 70;
  width: min(92vw, 24rem);
  display: grid;
  gap: 1rem;
  padding: 1.2rem;
  border: 1px solid rgba(12, 41, 50, 0.18);
  border-radius: 1.45rem;
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.98),
      rgba(243, 248, 247, 0.98)
    ),
    rgba(255, 255, 255, 0.98);
  box-shadow:
    0 28px 60px rgba(15, 23, 42, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.floating-panel__header,
.floating-panel__footer {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
}

.floating-panel__header h3 {
  margin: 0.25rem 0 0;
  font-family: "Bahnschrift SemiCondensed", "Aptos Display", sans-serif;
  font-size: 1.18rem;
  color: #173736;
}

.floating-panel__close,
.floating-secondary {
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  transition:
    transform 160ms ease,
    background-color 160ms ease;
}

.floating-panel__close {
  padding: 0.7rem 1rem;
  background: #174b49;
  color: #f4fbfb;
}

.floating-panel__close:hover,
.floating-secondary:hover {
  transform: translateY(-1px);
}

.floating-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.drag-probe {
  padding: 1rem;
  border-radius: 1.05rem;
  background:
    linear-gradient(180deg, rgba(240, 250, 248, 1), rgba(228, 244, 241, 0.94)),
    #edf8f6;
  border: 1px solid rgba(11, 126, 118, 0.14);
}

.drag-probe strong {
  display: block;
  margin-bottom: 0.35rem;
  color: #104442;
}

.drag-probe p,
.floating-help {
  margin: 0;
  color: #5c716f;
  line-height: 1.55;
}

.scroll-well {
  display: grid;
  gap: 0.5rem;
  max-height: 15rem;
  overflow: auto;
  padding-right: 0.25rem;
}

.floating-action {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  padding: 0.8rem 0.9rem;
  border: 1px solid rgba(19, 66, 64, 0.08);
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.88);
  color: #204240;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}

.floating-action:hover {
  border-color: rgba(11, 126, 118, 0.24);
  background: rgba(233, 251, 247, 0.92);
}

.floating-action small {
  color: #6c8481;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.floating-secondary {
  padding: 0.7rem 1rem;
  background: rgba(19, 66, 64, 0.08);
  color: #174b49;
}

@media (max-width: 960px) {
  .surface-header,
  .surface-footer {
    grid-template-columns: 1fr;
    display: grid;
  }

  .surface-status {
    justify-content: flex-start;
  }

  .outside-grid {
    grid-template-columns: 1fr;
  }

  .surface-footer {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .footer-note {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .surface-header,
  .stage-shell,
  .surface-footer,
  .trigger-bank,
  .floating-panel {
    padding: 1rem;
  }

  .surface-footer {
    grid-template-columns: 1fr;
  }

  .anchor-button {
    width: 100%;
  }
}
</style>
