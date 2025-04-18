import type { Meta, StoryObj } from "@storybook/vue3";
import { ref, computed, defineComponent } from "vue";

// Import the components
import { FloatingArrow } from "../components";
import { useArrow, useFloating } from "../composables";
import { type Placement, arrow } from "@floating-ui/dom";

// Create a simple wrapper component to demonstrate the arrow functionality
const ArrowDemo = defineComponent({
  components: {
    FloatingArrow,
  },
  setup() {
    // Create a floating context
    const referenceRef = ref<HTMLElement | null>(null);
    const floatingRef = ref<HTMLElement | null>(null);
    const arrowRef = ref<InstanceType<typeof FloatingArrow> | null>(null);
    const placement = ref<Placement>("bottom");
    // Setup floating positioning with arrow middleware
    const context = useFloating({
      elements: {
        reference: referenceRef,
        floating: floatingRef,
      },
      open: true,
      placement,
      middleware: computed(() => [arrow({ element: arrowRef.value?.$el })]),
    });

    // Placement options for the demo
    const placements = ["top", "right", "bottom", "left"];

    const currentPlacement = ref("bottom");

    // Update placement when changed
    const changePlacement = (newPlacement: Placement) => {
      currentPlacement.value = newPlacement;
      placement.value = newPlacement;
    };

    return {
      referenceRef,
      floatingRef,
      context,
      placements,
      currentPlacement,
      changePlacement,
      style: {
        position: context.strategy.value,
        top: "0px",
        left: "0px",
        transform: `translate(${context.x.value}px, ${context.y.value}px)`,
        background: "#f0f0f0",
        padding: "10px",
        borderRadius: "4px",
        width: "150px",
        textAlign: "center",
      },
    };
  },

  template: `
    <div>
      <div style="margin-bottom: 20px;">
        <span style="margin-right: 10px;">Placement:</span>
        <button 
          v-for="placement in placements" 
          :key="placement"
          @click="changePlacement(placement)"
          :style="{
            margin: '0 5px',
            fontWeight: currentPlacement === placement ? 'bold' : 'normal',
            background: currentPlacement === placement ? '#e6f7ff' : '#f0f0f0',
          }"
        >
          {{ placement }}
        </button>
      </div>
      
      <div style="display: flex; justify-content: center; align-items: center; height: 300px;">
        <div 
          ref="referenceRef"
          style="
            width: 100px;
            height: 100px;
            background: #4f46e5;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          "
        >
          Reference
        </div>
        
        <div
          ref="floatingRef"
          :style="style"
        >
          Floating Element
          <FloatingArrow
            ref="arrowRef"
            :context="context" 
            :width="14" 
            :height="7"
            :fill="'#f0f0f0'"
          />
        </div>
      </div>
    </div>
  `,
});

const meta = {
  title: "VFloat/FloatingArrow",
  component: ArrowDemo,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ArrowDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomStyling: Story = {
  render: () => ({
    components: {
      FloatingArrow,
    },
    setup() {
      const referenceRef = ref<HTMLElement | null>(null);
      const floatingRef = ref<HTMLElement | null>(null);
      const arrowRef = ref<InstanceType<typeof FloatingArrow> | null>(null);

      const floating = useFloating({
        elements: {
          reference: referenceRef,
          floating: floatingRef,
        },
        open: true,
        placement: ref("top"),
        middleware: computed(() => [arrow({ element: arrowRef.value?.$el })]),
      });

      return {
        referenceRef,
        floatingRef,
        floating,
        style: {
          position: floating.strategy.value,
          top: "0px",
          left: "0px",
          transform: `translate(${floating.x.value}px, ${floating.y.value}px)`,
          background: "#dcfce7",
          padding: "10px",
          borderRadius: "4px",
          width: "150px",
          textAlign: "center",
          border: "2px solid #16a34a",
        },
      };
    },
    template: `
      <div style="display: flex; justify-content: center; align-items: center; height: 300px;">
        <div 
          ref="referenceRef"
          style="
            width: 100px;
            height: 100px;
            background: #16a34a;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          "
        >
          Reference
        </div>
        
        <div
          ref="floatingRef"
          :style="style"
        >
          Custom Arrow Styling
          <FloatingArrow 
            ref="arrowRef"
            :context="floating" 
            :width="20" 
            :height="10"
            :fill="'#16a34a'"
            :tipRadius="2"
          />
        </div>
      </div>
    `,
  }),
};

export const WithStaticOffset: Story = {
  render: () => ({
    components: {
      FloatingArrow,
    },
    setup() {
      const referenceRef = ref<HTMLElement | null>(null);
      const floatingRef = ref<HTMLElement | null>(null);
      const arrowRef = ref<InstanceType<typeof FloatingArrow> | null>(null);

      const floating = useFloating({
        elements: {
          reference: referenceRef,
          floating: floatingRef,
        },
        open: true,
        placement: ref("bottom"),
        middleware: computed(() => [arrow({ element: arrowRef.value?.$el })]),
      });

      return {
        referenceRef,
        floatingRef,
        floating,
        style: {
          position: floating.strategy.value,
          top: "0px",
          left: "0px",
          transform: `translate(${floating.x.value}px, ${floating.y.value}px)`,
          background: "#fee2e2",
          padding: "10px",
          borderRadius: "4px",
          width: "200px",
          textAlign: "center",
          border: "2px solid #dc2626",
        },
      };
    },
    template: `
      <div style="display: flex; justify-content: center; align-items: center; height: 300px;">
        <div 
          ref="referenceRef"
          style="
            width: 150px;
            height: 100px;
            background: #dc2626;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          "
        >
          Reference
        </div>
        
        <div
          ref="floatingRef"
          :style="style"
        >
          Arrow with Static Offset
          <FloatingArrow
            ref="arrowRef"
            :context="floating" 
            :width="16" 
            :height="8"
            :fill="'#dc2626'"
            :staticOffset="20"
          />
        </div>
      </div>
    `,
  }),
};
