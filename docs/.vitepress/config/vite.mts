import tailwindcss from "@tailwindcss/vite";

export const vite = {
  plugins: tailwindcss() as never,
  build: {
    sourcemap: true,
    minify: false,
  },
  ssr: {
    noExternal: ["v-float"],
  },
};
