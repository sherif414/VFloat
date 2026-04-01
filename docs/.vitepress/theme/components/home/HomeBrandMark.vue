<template>
  <svg
    class="vf-home__brand-mark"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 128 128"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient
        id="vf-home-brand-cyan"
        x1="28"
        y1="24"
        x2="96"
        y2="96"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stop-color="#c3f5ff" />
        <stop offset="100%" stop-color="#00e5ff" />
      </linearGradient>
      <filter id="vf-home-brand-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="0 0 0 0 0 0 0 0 0 0.898 0 0 0 0 1 0 0 0 0.4 0"
          result="colored"
        />
        <feMerge>
          <feMergeNode in="colored" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <rect
      x="8"
      y="8"
      width="112"
      height="112"
      rx="28"
      fill="#0c0e11"
      stroke="#3b494c"
      stroke-opacity="0.9"
    />
    <path
      d="M35 39L64 86L93 39"
      stroke="#e2e2e6"
      stroke-width="8"
      stroke-linecap="square"
      stroke-linejoin="round"
    />
    <path
      d="M64 31V48"
      stroke="url(#vf-home-brand-cyan)"
      stroke-width="5"
      stroke-linecap="square"
      filter="url(#vf-home-brand-glow)"
    />
    <rect
      x="56"
      y="20"
      width="16"
      height="16"
      rx="4"
      fill="url(#vf-home-brand-cyan)"
      filter="url(#vf-home-brand-glow)"
    />
    <path d="M28 92H100" stroke="#3b494c" stroke-opacity="0.7" stroke-width="2" />
    <circle cx="64" cy="86" r="4" fill="#00e5ff" />
  </svg>
</template>
