# VFloat 1.0 Release Roadmap

This roadmap outlines the planned phases and tasks to reach the 1.0 release of VFloat, the Vue 3 port of Floating UI, based on the requirements defined in `requirements.md` and the project state as of April 2, 2025.

## Roadmap Visualization

```mermaid
gantt
    dateFormat  YYYY-MM-DD
    title VFloat 1.0 Release Roadmap (Revised Priorities)

    section Phase 1: Core Functionality & Middleware
    Complete Core Middleware :crit, p1_mw, 2025-04-03, 7d
    Implement detectOverflow : p1_do, after p1_mw, 2d
    Implement Virtual Elements : p1_ve, after p1_mw, 3d
    Core Unit Tests        : p1_ut, after p1_ve, 4d

    section Phase 2: Interaction Composables (Basic & Advanced)
    Implement useHover/Focus/Click : p2_hfc, after p1_ut, 5d
    Implement useDismiss         : p2_dis, after p2_hfc, 3d
    Implement useRole            : p2_role, after p2_dis, 2d
    Implement useInteractions    : p2_int, after p2_role, 2d
    Implement useListNavigation  : p2_ln, after p2_int, 6d
    Implement useTypeahead       : p2_th, after p2_ln, 4d
    Implement useClientPoint     : p2_cp, after p2_th, 2d
    Implement useMergeRefs       : p2_mr, after p2_cp, 1d
    Interaction Unit Tests     : p2_ut, after p2_mr, 7d // Combined testing effort

    section Phase 3: Core Components & Utilities
    Implement <FloatingArrow>      : p3_fa, after p2_ut, 2d
    Implement <FloatingPortal>     : p3_fp, after p3_fa, 3d
    Implement <FloatingTree> Comp. : p3_ft, after p3_fp, 2d
    Implement <FloatingOverlay>    : p3_fo, after p3_ft, 2d
    Implement useTransition      : p3_tr, after p3_fo, 3d
    Core Component Tests       : p3_ut, after p3_tr, 5d

    section Phase 4: Advanced Components & Focus
    Implement <FloatingFocusManager> : p4_ffm, after p3_ut, 5d
    Implement <FloatingList>       : p4_fl, after p4_ffm, 4d
    Implement <FloatingDelayGroup> : p4_fdg, after p4_fl, 3d
    Implement <Composite>          : p4_comp, after p4_fdg, 5d
    Advanced Component Tests     : p4_ut, after p4_comp, 6d

    section Phase 5: Documentation & Examples
    Write API Documentation      : p5_api, after p4_ut, 10d
    Create Usage Guides/Examples : p5_guides, after p5_api, 7d
    Write Accessibility Docs     : p5_a11y, after p5_guides, 3d

    section Phase 6: Testing, Refinement & RC
    Expand Test Coverage       : p6_test, after p5_a11y, 7d
    Accessibility Audit        : p6_a11y, after p6_test, 4d
    Bug Fixing & Refinement    : p6_fix, after p6_a11y, 10d
    Prepare Release Candidate  : p6_rc, after p6_fix, 2d

    section Phase 7: Final Release (1.0)
    Final RC Testing           : p7_test, after p6_rc, 5d
    Finalize Documentation     : p7_docs, after p7_test, 3d
    Build & Publish Prep       : p7_build, after p7_docs, 2d
    Release 1.0                : p7_release, after p7_build, 1d
```

## Phase Descriptions

1.  **Phase 1: Core Functionality & Middleware:** Focuses on completing the foundational positioning logic by implementing the remaining middleware functions (`shift`, `flip`, `size`, `autoPlacement`, `hide`, `inline`), `detectOverflow`, and support for virtual elements. Establish basic unit tests.
2.  **Phase 2: Interaction Composables (Basic & Advanced):** Implement all interaction patterns (`useHover`, `useFocus`, `useClick`, `useDismiss`, `useListNavigation`, `useTypeahead`, `useClientPoint`), accessibility roles (`useRole`), the mechanism to combine them (`useInteractions`), and the ref merging utility (`useMergeRefs`). Add comprehensive unit tests for all composables.
3.  **Phase 3: Core Components & Utilities:** Start building the UI component layer, including the visual arrow (`<FloatingArrow>`), DOM portal (`<FloatingPortal>`), tree context (`<FloatingTree>`), overlay (`<FloatingOverlay>`), and transition helpers (`useTransitionStyles`/`useTransitionStatus`). Add component and integration tests.
4.  **Phase 4: Advanced Components & Focus:** Implement the remaining, more complex components for focus management (`<FloatingFocusManager>`), list contexts (`<FloatingList>`), delay groups (`<FloatingDelayGroup>`), and composite widgets (`<Composite>`). Add tests.
5.  **Phase 5: Documentation & Examples:** Create comprehensive documentation covering the API, usage patterns, examples (potentially using the existing `docs/` structure), and accessibility best practices.
6.  **Phase 6: Testing, Refinement & RC:** Perform extensive testing (unit, integration, accessibility audit), fix bugs identified, refine the API based on usage feedback from examples/tests, and prepare a Release Candidate (RC).
7.  **Phase 7: Final Release (1.0):** Conduct final testing on the RC, finalize all documentation, prepare the build and publishing pipeline, and officially release version 1.0.
