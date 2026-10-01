<script>
import theme from "#build/ui/content/content-toc";
</script>

<script setup>
import { computed, nextTick, onUnmounted, useTemplateRef, watch } from "vue";
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from "reka-ui";
import { createReusableTemplate, reactivePick } from "@vueuse/core";
import { useAppConfig, useNuxtApp, useRouter } from "#imports";
import { useComponentProps } from "@nuxt/ui/composables/useComponentProps";
import { useForwardProps } from "@nuxt/ui/composables/useForwardProps";
import { useScrollspy } from "@nuxt/ui/composables/useScrollspy";
import { useScrollShadow } from "@nuxt/ui/composables/useScrollShadow";
import { useLocale } from "@nuxt/ui/composables/useLocale";
import { usePrefix } from "@nuxt/ui/composables/usePrefix";
import { tv } from "@nuxt/ui/utils/tv";

defineOptions({ inheritAttrs: false });

const _props = defineProps({
  as: { type: null, required: false, default: "nav" },
  trailingIcon: { type: null, required: false },
  title: { type: String, required: false },
  color: { type: null, required: false },
  highlight: { type: Boolean, required: false },
  highlightColor: { type: null, required: false },
  highlightVariant: { type: null, required: false },
  links: { type: Array, required: false },
  class: { type: null, required: false },
  ui: { type: Object, required: false },
  defaultOpen: { type: Boolean, required: false },
  open: { type: Boolean, required: false },
});

const emits = defineEmits(["update:open", "move"]);
const slots = defineSlots();
const props = useComponentProps("contentToc", _props);
const rootProps = useForwardProps(reactivePick(props, "as", "open", "defaultOpen"), emits);
const { t } = useLocale();
const router = useRouter();
const appConfig = useAppConfig();
const { activeHeadings, updateHeadings } = useScrollspy();
const prefix = usePrefix();
const contentRef = useTemplateRef("contentRef");
const { style: scrollShadowStyle } = useScrollShadow(contentRef);

const [DefineListTemplate, ReuseListTemplate] = createReusableTemplate({
  props: {
    links: Array,
    level: Number,
  },
});
const [DefineTriggerTemplate, ReuseTriggerTemplate] = createReusableTemplate();
const [DefineContentTemplate, ReuseContentTemplate] = createReusableTemplate();

const tocUi = computed(() =>
  tv({ extend: theme, ...appConfig.ui?.contentToc })({
    color: props.color,
    highlight: props.highlight,
    highlightVariant: props.highlightVariant,
    highlightColor: props.highlightColor || props.color,
  }),
);

function scrollToHeading(id) {
  const encodedId = encodeURIComponent(id);
  router.push(`#${encodedId}`);
  emits("move", id);
}

function flattenLinks(links) {
  return links.flatMap((link) => [link, ...(link.children ? flattenLinks(link.children) : [])]);
}

function flattenLinksWithLevel(links, level = 0) {
  return links.flatMap((link) => [
    { link, level },
    ...(link.children ? flattenLinksWithLevel(link.children, level + 1) : []),
  ]);
}

const linkHeight = 1.75;

// Single-item active tracking: find the first visible heading from top
const activeIndex = computed(() => {
  if (!activeHeadings.value?.length) {
    return -1;
  }
  return flattenLinks(props.links || []).findIndex((link) =>
    activeHeadings.value.includes(link.id),
  );
});

const activeId = computed(() => {
  if (activeIndex.value < 0) {
    return null;
  }
  return flattenLinks(props.links || [])[activeIndex.value]?.id ?? null;
});

const listStyle = computed(() => ({
  "--list-height": `${flattenLinks(props.links || []).length * linkHeight}rem`,
}));

// Indicator bar is locked to a single link height and tracks the activeIndex
const indicatorStyle = computed(() => {
  if (activeIndex.value < 0) {
    return undefined;
  }
  return {
    "--indicator-size": `${linkHeight}rem`,
    "--indicator-position": `${activeIndex.value * linkHeight}rem`,
  };
});

watch(activeIndex, (index) => {
  const container = contentRef.value;
  if (index < 0 || !container) {
    return;
  }
  nextTick(() => {
    const link = container.querySelectorAll('a[data-slot="link"]')[index];
    if (!link) {
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const linkOffset = linkRect.top - containerRect.top + container.scrollTop;
    container.scrollTo({
      top: linkOffset - container.clientHeight / 2 + linkRect.height / 2,
      behavior: "smooth",
    });
  });
});

const circuitMaskStyle = computed(() => {
  if (!props.highlight || props.highlightVariant !== "circuit" || !props.links?.length) {
    return undefined;
  }
  const flatLinks = flattenLinksWithLevel(props.links);
  const svgUnit = 16;
  const svgLinkHeight = linkHeight * svgUnit;
  const svgHeight = flatLinks.length * svgLinkHeight;
  const x0 = 0.5;
  const x1 = 10.5;
  let path = "";
  let currentX = x0;
  let y = 0;
  flatLinks.forEach((item, index) => {
    const targetX = item.level > 0 ? x1 : x0;
    const nextY = y + svgLinkHeight;
    if (index === 0) {
      path += `M${targetX} ${y}`;
      currentX = targetX;
    }
    if (targetX !== currentX) {
      path += ` L${targetX} ${y + 6}`;
      currentX = targetX;
    }
    path += ` L${currentX} ${nextY - (index < flatLinks.length - 1 && flatLinks[index + 1]?.level !== item.level ? 6 : 0)}`;
    y = nextY;
  });
  const svgPath = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 ${svgHeight}'><path d='${path}' stroke='black' stroke-width='1' fill='none'/></svg>`,
  );
  return {
    width: "0.75rem",
    height: `${flatLinks.length * linkHeight}rem`,
    maskImage: `url("data:image/svg+xml,${svgPath}")`,
  };
});

const nuxtApp = useNuxtApp();

function refreshHeadings() {
  const flatLinks = flattenLinks(props.links || []);
  if (!flatLinks.length) {
    updateHeadings([]);
    return;
  }
  const selector = flatLinks.map((l) => `#${CSS.escape(l.id)}`).join(", ");
  const headings = Array.from(document.querySelectorAll(selector));
  updateHeadings(headings);
}

const offLoadingEnd = nuxtApp.hooks.hook("page:loading:end", refreshHeadings);
const offTransitionFinish = nuxtApp.hooks.hook("page:transition:finish", refreshHeadings);

onUnmounted(() => {
  offLoadingEnd();
  offTransitionFinish();
});
</script>

<template>
  <!-- eslint-disable-next-line vue/no-template-shadow -->
  <DefineListTemplate v-slot="{ links, level }">
    <ul
      :class="
        level > 0
          ? tocUi.listWithChildren({ class: props.ui?.listWithChildren })
          : tocUi.list({ class: props.ui?.list })
      "
    >
      <li
        v-for="(link, index) in links"
        :key="index"
        :class="
          link.children && link.children.length > 0
            ? tocUi.itemWithChildren({
                class: [props.ui?.itemWithChildren, link.ui?.itemWithChildren],
              })
            : tocUi.item({ class: [props.ui?.item, link.ui?.item] })
        "
      >
        <a
          :href="`#${link.id}`"
          data-slot="link"
          :class="
            tocUi.link({
              class: [props.ui?.link, link.ui?.link, link.class],
              active: activeId === link.id,
            })
          "
          @click.prevent="scrollToHeading(link.id)"
        >
          <slot name="link" :link="link">
            <span
              data-slot="linkText"
              :class="tocUi.linkText({ class: [props.ui?.linkText, link.ui?.linkText] })"
            >
              {{ link.text }}
            </span>
          </slot>
        </a>

        <ReuseListTemplate v-if="link.children?.length" :links="link.children" :level="level + 1" />
      </li>
    </ul>
  </DefineListTemplate>

  <DefineTriggerTemplate v-slot="{ open }">
    <slot name="leading" :open="open" :ui="tocUi" />

    <span data-slot="title" :class="tocUi.title({ class: props.ui?.title })">
      <slot :open="open">{{ props.title || t("contentToc.title") }}</slot>
    </span>

    <span data-slot="trailing" :class="tocUi.trailing({ class: props.ui?.trailing })">
      <slot name="trailing" :open="open" :ui="tocUi">
        <UIcon
          :name="props.trailingIcon || appConfig.ui.icons.chevronDown"
          data-slot="trailingIcon"
          :class="tocUi.trailingIcon({ class: props.ui?.trailingIcon })"
        />
      </slot>
    </span>
  </DefineTriggerTemplate>

  <DefineContentTemplate>
    <div
      v-if="props.highlight"
      data-slot="indicator"
      :class="tocUi.indicator({ class: props.ui?.indicator })"
      :style="{ ...indicatorStyle, ...(circuitMaskStyle || {}) }"
    >
      <div
        data-slot="indicatorLine"
        :class="tocUi.indicatorLine({ class: props.ui?.indicatorLine })"
      />
      <div
        v-if="indicatorStyle"
        data-slot="indicatorActive"
        :class="tocUi.indicatorActive({ class: props.ui?.indicatorActive })"
      />
    </div>

    <slot name="content" :links="props.links">
      <ReuseListTemplate :links="props.links" :level="0" />
    </slot>
  </DefineContentTemplate>

  <CollapsibleRoot
    v-slot="{ open }"
    data-slot="root"
    v-bind="{ ...rootProps, ...$attrs }"
    :default-open="props.defaultOpen"
    :class="tocUi.root({ class: [props.ui?.root, props.class] })"
  >
    <div data-slot="container" :class="tocUi.container({ class: props.ui?.container })">
      <div v-if="!!slots.top" data-slot="top" :class="tocUi.top({ class: props.ui?.top })">
        <slot name="top" :links="props.links" />
      </div>

      <template v-if="props.links?.length">
        <CollapsibleTrigger
          data-slot="trigger"
          :class="tocUi.trigger({ class: [props.ui?.trigger, prefix('lg:hidden')] })"
        >
          <ReuseTriggerTemplate :open="open" />
        </CollapsibleTrigger>

        <CollapsibleContent
          data-slot="content"
          :class="tocUi.content({ class: [props.ui?.content, prefix('lg:hidden')] })"
        >
          <ReuseContentTemplate />
        </CollapsibleContent>

        <p
          data-slot="trigger"
          :class="tocUi.trigger({ class: [props.ui?.trigger, prefix('hidden lg:flex')] })"
        >
          <ReuseTriggerTemplate :open="open" />
        </p>

        <div
          ref="contentRef"
          data-slot="content"
          :class="tocUi.content({ class: [props.ui?.content, prefix('hidden lg:flex')] })"
          :style="[listStyle, scrollShadowStyle]"
        >
          <ReuseContentTemplate />
        </div>
      </template>

      <div
        v-if="!!slots.bottom"
        data-slot="bottom"
        :class="
          tocUi.bottom({ class: props.ui?.bottom, body: !!slots.top || !!props.links?.length })
        "
      >
        <slot name="bottom" :links="props.links" />
      </div>
    </div>
  </CollapsibleRoot>
</template>
