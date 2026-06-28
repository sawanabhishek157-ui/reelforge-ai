"""
Objective motion meter using dense optical flow (OpenCV Farneback).

NOT screenshot diffing — computes per-pixel motion vectors between frames and
reports the mean motion magnitude (pixels/frame). Use it to verify a clip
actually moves, and to compare weak vs strong parallax renders quantitatively.

Run: uv run --with opencv-python-headless --with numpy scripts/motion-meter.py <video.mp4>
"""
# /// script
# requires-python = ">=3.10"
# dependencies = ["opencv-python-headless", "numpy"]
# ///
import statistics
import sys

import cv2
import numpy as np

path = sys.argv[1]
cap = cv2.VideoCapture(path)
ok, prev = cap.read()
if not ok:
    print("could not read video")
    sys.exit(1)

# Downscale for speed; motion magnitude is reported relative to this width.
W = 320
def small(frame):
    h, w = frame.shape[:2]
    return cv2.resize(frame, (W, int(h * W / w)))

prevg = cv2.cvtColor(small(prev), cv2.COLOR_BGR2GRAY)
mags = []
i = 0
while True:
    ok, frame = cap.read()
    if not ok:
        break
    i += 1
    if i % 2:  # sample every other frame
        continue
    g = cv2.cvtColor(small(frame), cv2.COLOR_BGR2GRAY)
    flow = cv2.calcOpticalFlowFarneback(prevg, g, None, 0.5, 3, 15, 3, 5, 1.2, 0)
    mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
    mags.append(float(mag.mean()))
    prevg = g

if not mags:
    print("no frame pairs")
    sys.exit(1)

mean = statistics.mean(mags)
print(f"file={path}")
print(f"frame_pairs={len(mags)} mean_motion={mean:.3f}px/frame max={max(mags):.3f} (at {W}px width)")
# Rough interpretation guide for this width:
verdict = "STILL/imperceptible" if mean < 0.3 else "subtle" if mean < 0.8 else "clearly moving" if mean < 2.0 else "strong motion"
print(f"verdict: {verdict}")
