---
trigger: model_decision
description: when writing or modifing api documentation pages
---

---
trigger: api_documentation
description: should be used when writing or reviewing API documentation
---

# API Documentation Style Guide

API documentation in VFloat should be **reference material**, not guides or tutorials.

## Purpose

API docs should:
- Provide clear, concise API signatures
- Document all parameters/options with types
- Show minimal, focused examples
- Link to related APIs

API docs should NOT:
- Include lengthy usage guides or tutorials
- Contain "why use this" or conceptual explanations
- Have extensive "best practices" sections
- Show complex, multi-feature examples
- Include styling or accessibility guides

## Standard Structure

All API documentation **MUST** follow this structure:

```markdown
# [API Name]

[Brief 1-2 sentence description of what it does]

## Signature

\`\`\`ts
// Function/composable signature with full type definitions
function apiName(
  param1: Type1,
  param2: Type2,
  options?: OptionsType
): ReturnType
\`\`\`

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| param1 | \`Type1\` | Yes | Description |
| param2 | \`Type2\` | Yes | Description |
| options | \`OptionsType\` | No | Configuration options |

## Options

\`\`\`ts
interface OptionsType {
  option1?: Type
  option2?: Type
}
\`\`\`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| option1 | \`Type\` | \`defaultValue\` | Description |
| option2 | \`Type\` | \`defaultValue\` | Description |

## Return Value

\`\`\`ts
interface ReturnType {
  property1: Type
  property2: Type
}
\`\`\`

| Property | Type | Description |
|----------|------|-------------|
| property1 | \`Type\` | Description |
| property2 | \`Type\` | Description |

## Examples

### Basic Usage

\`\`\`vue
<script setup>
// Minimal example showing basic usage
</script>
\`\`\`

### With Options

\`\`\`vue
<script setup>
// Example showing common options
</script>
\`\`\`

## See Also

- [Related API 1](/api/related-1)
- [Related API 2](/api/related-2)
\`\`\`

## Guidelines

### Description
- Keep it to 1-2 sentences
- Focus on WHAT it does, not WHY or WHEN to use it
- Be precise and technical

### Signature
- Always show the full TypeScript signature
- Include all overloads if applicable
- Use proper type definitions

### Parameters/Options
- Use tables for clarity
- Always include type information
- Mark required vs optional clearly
- Keep descriptions concise (one line preferred)

### Examples
- Keep examples minimal and focused
- Show only API usage, not complete applications
- Typically 2-3 examples maximum
- Each example should demonstrate one specific aspect

### What NOT to Include
- ❌ "Why use this" sections
- ❌ "When to use" sections  
- ❌ "Best practices" sections
- ❌ "Accessibility considerations" sections
- ❌ Long explanatory text
- ❌ Complex multi-feature examples
- ❌ Styling guides
- ❌ Comparison with other libraries

### Where Guide Content Should Go
- Usage guides → `/guide/` directory