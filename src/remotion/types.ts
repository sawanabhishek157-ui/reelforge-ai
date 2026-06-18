export type Scene = {
  startSec: number;
  endSec: number;
  imageUrl: string; // public-relative URL like "/projects/<id>/scenes/scene-0.png"
  caption: string;
  zoom: "in" | "out";
};

export type Plan = {
  durationSec: number;
  voiceoverUrl: string;
  scenes: Scene[];
};
