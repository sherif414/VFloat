import type { Middleware } from "@floating-ui/dom";
import { computed, type MaybeRefOrGetter, ref, toValue } from "vue";
import type { FloatingMiddlewareRegistry } from "@/core/floating-internals";
import { tryOnScopeDispose } from "@/core/lifecycle";

type MiddlewareRegistration = {
  id: number;
  middleware: MaybeRefOrGetter<Middleware | null | undefined>;
};

export function createMiddlewareRegistry(
  baseMiddlewares: MaybeRefOrGetter<Middleware[] | undefined>,
): FloatingMiddlewareRegistry {
  const registrations = ref<MiddlewareRegistration[]>([]);
  let nextRegistrationId = 0;

  const middlewares = computed(() => {
    const merged = [...(toValue(baseMiddlewares) ?? [])];

    for (const registration of registrations.value) {
      const middleware = toValue(registration.middleware);

      if (!middleware) {
        continue;
      }

      const existingIndex = merged.findIndex((candidate) => candidate.name === middleware.name);

      if (existingIndex === -1) {
        merged.push(middleware);
      } else {
        merged[existingIndex] = middleware;
      }
    }

    return merged;
  });

  const register = (middleware: MaybeRefOrGetter<Middleware | null | undefined>) => {
    const registration = {
      id: nextRegistrationId++,
      middleware,
    };

    registrations.value = [...registrations.value, registration];

    const unregister = () => {
      registrations.value = registrations.value.filter(
        (candidate) => candidate.id !== registration.id,
      );
    };

    tryOnScopeDispose(unregister);

    return unregister;
  };

  return {
    middlewares,
    register,
  };
}
