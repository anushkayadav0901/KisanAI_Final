export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;

  const start = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      })
      .catch((err) => {
        console.warn("[sw] registration failed:", err);
      });

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
