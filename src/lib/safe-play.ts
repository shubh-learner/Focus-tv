export function safePlay(play: () => unknown): void {
  try {
    const result = play();
    if (result && typeof (result as Promise<void>).catch === "function") {
      void (result as Promise<void>).catch(() => {});
    }
  } catch {
    // Autoplay can be blocked; the on-screen controls remain available.
  }
}
