#!/bin/sh
set -e

# Persistent volume layout:
#   /data/reelforge.db             — SQLite DB
#   /data/projects/<id>/...        — uploaded refs, voice mp3, output mp4
mkdir -p /data/projects

# Make /app/public/projects point at the persistent volume so the file uploads
# and rendered MP4s survive container restarts AND get served by Next.js as
# static assets at /projects/<id>/...
rm -rf /app/public/projects 2>/dev/null || true
ln -s /data/projects /app/public/projects

exec "$@"
