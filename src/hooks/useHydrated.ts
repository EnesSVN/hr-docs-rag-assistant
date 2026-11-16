import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

// False on the server and during the first render in the browser, true right after.
// Lets a component hide something that can only be known in the browser (like the saved
// theme) until it is right, instead of showing the wrong thing for a moment.
export function useHydrated(): boolean {
  return useSyncExternalStore(noSubscription, () => true, () => false);
}
