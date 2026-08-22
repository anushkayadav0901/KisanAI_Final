/**
 * registerSW.ts — service worker registration
 *
 * Registered only in production builds. In dev the worker would serve cached
 * modules over Vite's HMR and make every change look like it did not apply.
 */

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;

  // The module can evaluate after the load event has already fired (a warm
  // navigation, or a bundle that resolves late), in which case a "load"
  // listener never runs and the worker silently never registers.
  const start = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Ask any waiting worker to take over immediately, so a farmer who
        // reopens the app after an update is not left on a stale build.
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      })
      .catch((err) => {
        console.warn("[sw] registration failed:", err);
      });

    // The worker asks the page to replay the queue when connectivity returns.
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SYNC_QUEUE") {
        window.dispatchEvent(new CustomEvent("kisan:queue-changed"));
      }
    });
  };

  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start, { once: true });
  }
}
