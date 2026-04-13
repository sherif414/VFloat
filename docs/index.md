---
title: VFloat
titleTemplate: Vue 3 positioning primitives
description: VFloat is a Vue 3 toolkit for anchored floating interfaces and positioning behavior.
page: true
footer: false
---

<div class="vfloat-home">

<h1>VFloat</h1>

<p>Anchored floating interfaces for Vue 3.</p>

<div class="vfloat-home__actions">

<a class="vfloat-home__button vfloat-home__button--primary" href="/guide/">Read the guide</a>
<a class="vfloat-home__button vfloat-home__button--secondary" href="/api/">Browse the API</a>

</div>

</div>

<style>
.vfloat-home {
  display: grid;
  gap: 1.15rem;
  max-width: 42rem;
  margin: 0 auto;
  padding: clamp(3rem, 8vw, 6rem) 0 clamp(2rem, 5vw, 3rem);
  text-align: center;
}

.vfloat-home h1 {
  margin: 0;
  color: var(--vt-c-text-1);
  font-size: clamp(3.2rem, 8vw, 5.4rem);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.07em;
}

.vfloat-home > p {
  margin: 0 auto;
  max-width: 34rem;
  color: var(--vt-c-text-2);
  font-size: clamp(1.05rem, 2vw, 1.2rem);
  line-height: 1.75;
}

.vfloat-home__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.vfloat-home__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 11.5rem;
  min-height: 2.9rem;
  padding: 0 1.15rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  transition:
    transform 160ms ease,
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}

.vfloat-home__button:hover {
  transform: translateY(-1px);
}

.vfloat-home__button--primary {
  background: var(--vt-c-brand);
  color: var(--vt-c-white);
}

.vfloat-home__button--primary:hover {
  background: var(--vt-c-brand-dark);
}

.vfloat-home__button--secondary {
  border-color: var(--vt-c-divider-light);
  background: var(--vt-c-bg-soft);
  color: var(--vt-c-text-1);
}

.vfloat-home__button--secondary:hover {
  border-color: var(--vt-c-brand-light);
  color: var(--vt-c-brand);
}

@media (max-width: 639px) {
  .vfloat-home {
    gap: 1rem;
  }

  .vfloat-home__button {
    width: 100%;
    min-width: 0;
  }
}
</style>
