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
        # Ease the linear progress so the move starts/ends gently (no jerk).
        t = self.tau
        e = t * t * (3.0 - 2.0 * t)   # smoothstep 0..1
        s.steady = 0.30
        s.isometric = 0.60
        s.inpaint.limit = INPAINT

        # ONE-DIRECTIONAL camera move (no circular/oscillating sweep — the reverse
        # stroke is what made the morph wobble). The camera pushes FORWARD into the
        # scene while drifting once in a single direction set by STYLE.
        s.zoom = 1.0 - 0.10 * e            # continuous forward dolly (push-in)
        # Parallax depth scales with AMP. AMP=0 -> ~0.05 (morph-free: rack focus
        # only, people stay crisp). AMP>0 -> real parallax (use only on safe,
        # person-free scenes; it morphs hard-edged subjects).
        s.height = (0.05 + 0.55 * AMP) * (0.7 + 0.3 * e)

        # direction of the single drift (degrees of a semicircle, never returning)
        if STYLE == "orbit":
            ang = math.pi * 0.25           # diagonal up-right
        elif STYLE == "vertical":
            ang = math.pi * 0.5            # upward
        elif STYLE == "dolly":
            ang = 0.0                      # pure push-in, minimal drift
        else:                              # zoomdrift
            ang = math.pi                  # leftward
        drift = AMP * (0.5 if STYLE == "dolly" else 1.0)
        s.offset = (drift * e * math.cos(ang), drift * 0.7 * e * math.sin(ang))

        # Rack focus: pull focus from foreground to background as we move in.
        if RACK:
            s.blur.intensity = 0.32
            s.blur.start = 0.0
            s.blur.end = 1.0
            s.focus = 0.12 + 0.7 * e       # near -> far focus pull


if __name__ == "__main__":
    scene = Strong()
    scene.cli.meta(sys.argv[1:])
