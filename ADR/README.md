# Architecture decision records

These records capture decisions that are likely to affect future work. They are grouped by technical area. Proposals remain in [RFC](../RFC/).

Create an ADR with:

```bash
pnpm adr:new -- --group architecture --title "Use a shared floating node"
```

Refresh this index with:

```bash
pnpm adr:index
```

<!-- adr-index:start -->

## Architecture

| ADR | Decision | Status | Date |
| --- | --- | --- | --- |
| [ADR-architecture-0001](./architecture/0001-cross-realm-dom-and-iframe-environment-resolution.md) | Cross-realm DOM and iframe environment resolution | accepted | 2026-09-24 |
## Interactions

| ADR | Decision | Status | Date |
| --- | --- | --- | --- |
| [ADR-interactions-0001](./interactions/0001-per-instance-listeners-for-outside-click-dismissal.md) | Per-instance listeners for outside-click dismissal | accepted | 2026-09-24 |
| [ADR-interactions-0002](./interactions/0002-unified-touch-pointer-and-virtual-click-model-for-outside-click-dismissal.md) | Unified touch, pointer, and virtual click model for outside-click dismissal | accepted | 2026-09-24 |
| [ADR-interactions-0003](./interactions/0003-native-pointer-lifecycle-for-touch-outside-click-dismissal.md) | Native pointer lifecycle for touch outside click dismissal | accepted | 2026-09-25 |

<!-- adr-index:end -->
