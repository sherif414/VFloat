# META INFORMANTION ABOUT THE PROJECT

- This project is named VFloat
- It's heavily inspired by Floating UI, however it's not a fork of it.
- Some of the api is similar to Floating UI, however it's not a direct copy. many parts of the api are different, so keep that in mind.

## Commit Messages

- Follow Conventional Commits for all Git commit messages.
- Use lowercase commit types such as `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `ci`, `build`, `perf`, `style`, and `revert`.
- Keep the header in the form `type(scope)!: description`.
- Treat `0.x` as an unstable pre-1.0 line and use the "infinite minor" pattern for ongoing API evolution.
- Use `fix` for patches, `feat` for new features, and `1.0.0` as the point where breaking changes should become major releases.

## Naming Conventions

- Follow existing VFloat naming before borrowing Floating UI terminology. Similarity is fine, but VFloat is not a direct copy.
- Public composables use `useX` export names with kebab-case filenames. Example: `useFloating` lives in `use-floating.ts`.
- Element refs and variables should use explicit `*El` names. Prefer `anchorEl`, `floatingEl`, and `arrowEl` over generic names like `reference` or `element`.
- The stable public entrypoint remains `useFloating(anchorEl, floatingEl, options)`. Preserve that call shape unless a change is explicitly requested.
- Grouped floating return data uses the `refs`, `state`, and `position` vocabulary. New API additions should fit into those groups rather than flattening more fields onto the root.
- Open-change reasons and similar string-literal event names should use kebab-case. Example: `anchor-click`, `outside-pointer`, and `escape-key`.
- Internal implementation files should use descriptive kebab-case nouns with role-oriented suffixes where helpful, such as `*-controller.ts`, `*-registry.ts`, `*-factory.ts`, `*-strategies.ts`, `geometry.ts`, and `bridge.ts`.
- Tests should mirror the source name they cover and use the `.test.ts` suffix.
- Boolean option names should read like flags. Prefer prefixes such as `enabled`, `allow`, `ignore`, `closeOn`, `openOn`, `prevent`, `require`, `return`, and `focus` when they match the behavior.
- When documenting or demoing the floating root, prefer a local variable name like `context` so examples stay consistent with the grouped API shape.

## Type Conventions

- Public composable companion types use `UseXOptions`, `UseXReturn`, and `UseXContext` when those shapes are exposed.
- Shared root and state types use the `Floating*` prefix. Examples: `FloatingRoot`, `FloatingContext`, `FloatingRefs`, `FloatingState`, and `FloatingPosition`.
- Prefer `interface` for object-shaped public contracts and configuration objects. Examples: `UseFloatingOptions`, `UseClickContext`, and `FloatingPosition`.
- Prefer `type` for unions, function signatures, tuples, and simple aliases. Examples: `OpenChangeReason`, `SafePolygonHandler`, `Point`, and `AnchorElement`.
- Domain-specific aliases should keep the domain noun in the type name. Prefer names like `AnchorElement`, `FloatingElement`, `Coordinates`, and `PointerEventData` over generic aliases.
- Internal structural adapter types can use suffixes like `Shape` and `Like` when they describe partial or compatibility contracts rather than primary public types. Examples: `FloatingRefsShape` and `FloatingPositionLike`.
- Internal service and protocol types should use explicit role suffixes when applicable, such as `*Controller`, `*Registry`, `*Strategy`, `*Contract`, and `*Registration`.
