"""
DepthFlow parallax scene — combines Ken Burns (zoom) + depth parallax, with
inpaint-limit to suppress edge morphing, and several motion styles for variety.

Run with the installed DepthFlow env's python:
  ~/.local/share/uv/tools/depthflow/bin/python scripts/df_scene.py \
      input -i <image> -d <depth> main -o <out.mp4> -t <sec> -f 30 -w 1080 -h 1920 --no-turbo

Env tunables:
  DF_AMP     parallax camera sweep amplitude        [default 0.5]
  DF_HEIGHT  depth displacement intensity           [default 0.35]
  DF_INPAINT inpaint-limit (suppresses edge morph)  [default 0.4]
  DF_PHASE   phase offset (vary per scene)          [default 0.0]
  DF_STYLE   zoomdrift | orbit | dolly | vertical   [default zoomdrift]
"""
import math
import os
import sys

from attrs import define
from depthflow.scene import DepthScene

AMP = float(os.environ.get("DF_AMP", "0.28"))  # subtle parallax — depth cue, minimal morph
RACK = os.environ.get("DF_RACK", "1") == "1"   # depth-of-field rack focus pull
HEIGHT = float(os.environ.get("DF_HEIGHT", "0.35"))
INPAINT = float(os.environ.get("DF_INPAINT", "0.0"))
PHASE = float(os.environ.get("DF_PHASE", "0.0"))
STYLE = os.environ.get("DF_STYLE", "zoomdrift")


@define
class Strong(DepthScene):
    """Ken Burns zoom + depth parallax, with edge-morph suppression."""

    def update(self):
        s = self.state
        t = self.tau          # normalized 0..1 progress
        c = self.cycle + PHASE
        s.height = HEIGHT
        s.steady = 0.30
        s.focus = 0.30
        s.inpaint.limit = INPAINT  # suppress stretching at steep depth edges

        if STYLE == "orbit":
            s.zoom = 0.98 - 0.04 * t                     # gentle push
            s.isometric = 0.50 * math.cos(c) + 0.75
            s.offset = (AMP * math.sin(c + math.pi / 2.0), AMP * 0.5 * math.sin(c))
        elif STYLE == "dolly":
            s.zoom = 1.0 - 0.06 * math.sin(t * math.pi)  # in then settle (dolly)
            s.isometric = 0.5 * (1.0 - math.cos(c))
            s.offset = (AMP * 0.6 * math.sin(c), 0.0)
        elif STYLE == "vertical":
            s.zoom = 1.0 - 0.05 * t                       # slow push-in
            s.isometric = 0.60
            s.offset = (AMP * 0.3 * math.sin(c), AMP * math.sin(c))
        else:  # "zoomdrift" — Ken Burns push-in + horizontal parallax drift
            s.zoom = 1.0 - 0.07 * t                       # clear, steady zoom-in
            s.isometric = 0.60
            s.offset = (AMP * math.sin(c), AMP * 0.3 * math.sin(c * 0.7))

        # Rack focus: depth-of-field pull from foreground to background over the
        # clip. Reads as cinematic 3D depth with zero morphing.
        if RACK:
            s.blur.intensity = 0.2                        # gentle DoF — not a heavy ghosting blur
            s.blur.start = 0.55
            s.blur.end = 1.0
            s.focus = 0.20 + 0.45 * t                     # subtle near -> far focus pull


if __name__ == "__main__":
    scene = Strong()
    scene.cli.meta(sys.argv[1:])
