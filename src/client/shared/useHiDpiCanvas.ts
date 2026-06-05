import { useEffect } from "react";

export function useHiDpiCanvas(
  canvasRef: { current: HTMLCanvasElement | null },
  redrawRef: { current: () => void },
  dependencies: ReadonlyArray<unknown>,
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let frameId: number | null = null;
    const observeTarget = canvas.parentElement ?? canvas;

    const syncCanvasResolution = () => {
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) {
        return;
      }

      const devicePixelRatio = window.devicePixelRatio || 1;
      const nextWidth = Math.round(bounds.width * devicePixelRatio);
      const nextHeight = Math.round(bounds.height * devicePixelRatio);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }

      redrawRef.current();
    };

    const scheduleSync = () => {
      if (frameId !== null) {
        return;
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        syncCanvasResolution();
      });
    };

    scheduleSync();
    const resizeObserver = new ResizeObserver(() => {
      scheduleSync();
    });
    resizeObserver.observe(observeTarget);
    window.addEventListener("resize", scheduleSync);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleSync);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [canvasRef, redrawRef]);

  useEffect(() => {
    redrawRef.current();
  }, dependencies);
}
