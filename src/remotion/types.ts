export type Motion = "zoom-in" | "zoom-out" | "pan-left" | "pan-right";

export type Scene = {
  startSec: number;
  endSec: number;
  imageUrl: string; // public-relative URL like "/projects/<id>/scenes/scene-0.png"
  caption: string;
  motion: Motion;
};

export type Plan = {
  durationSec: number;
  voiceoverUrl: string;
  width?: number;
  height?: number;
  scenes: Scene[];
};
