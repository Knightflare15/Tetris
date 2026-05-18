import type { LineClearEffect } from "../shared/types";

const SOUND_PATHS = {
  bgm: "/sounds/bgm.txt",
  lineClear: "/sounds/line-clear.txt",
  combo: "/sounds/combo.txt",
  tSpin: "/sounds/t-spin.txt",
} as const;

export function playLineClearSound(effect: LineClearEffect): void {
  if (effect.label.includes("T-Spin")) {
    playSound(SOUND_PATHS.tSpin);
    return;
  }
  if (effect.label.includes("Combo")) {
    playSound(SOUND_PATHS.combo);
    return;
  }
  playSound(SOUND_PATHS.lineClear);
}

export function bgmPath(): string {
  return SOUND_PATHS.bgm;
}

function playSound(src: string): void {
  const audio = new Audio(src);
  audio.volume = 0.55;
  void audio.play().catch(() => {
    // Placeholder .txt files are intentionally silent until real audio assets are supplied.
  });
}
