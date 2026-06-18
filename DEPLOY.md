# Deploy ReelForge AI to Fly.io (free / cheap testing)

A 1-VM, 1-volume deploy. Single command per step. Total ~10 min once you have an account.

## Prerequisites
- A free Fly.io account: <https://fly.io/app/sign-up>
- Your ElevenLabs + Anthropic API keys (already in your `.env.local`)

## 1 — Install the Fly CLI
```bash
brew install flyctl
fly auth signup    # or `fly auth login` if you already have an account
```

## 2 — Claim a unique app name
The default name in `fly.toml` is `reelforge-ai` and is probably taken globally on Fly. Pick a unique one (any short slug works).

```bash
cd /Users/sawan/Downloads/Projects/reelforge-ai
fly apps create reelforge-<your-name>
# then edit fly.toml and change `app = "reelforge-ai"` to your slug
```

## 3 — Create the persistent volume (holds SQLite + uploaded images + rendered MP4s)
```bash
fly volumes create reelforge_data --region bom --size 3 --yes
```

## 4 — Set the API keys (encrypted at rest)
```bash
fly secrets set \
  ANTHROPIC_API_KEY="$(grep ^ANTHROPIC_API_KEY= .env.local | cut -d= -f2-)" \
  ELEVENLABS_API_KEY="$(grep ^ELEVENLABS_API_KEY= .env.local | cut -d= -f2-)"
```

## 5 — Deploy
```bash
fly deploy
```
First build pulls the Node + Chromium layers — ~3–5 min. Subsequent deploys are <60 s.

When it finishes you'll see:
```
Visit your newly deployed app at https://reelforge-<your-name>.fly.dev
```

That's the URL to share with your friend.

## 6 — Watch logs
```bash
fly logs
```

## Useful commands
```bash
fly status            # how many VMs running
fly ssh console       # SSH into the running VM
fly scale memory 512  # downsize once you've confirmed renders work
fly destroy reelforge-<your-name>   # delete everything when done
```

## What does it cost during testing?

Fly bills hourly. The numbers below are the **maximum** you could pay if the VM ran 24/7 all month.

| Resource | If always-on | With auto-stop (this config) |
|---|---|---|
| shared-cpu-1x 1 GB VM | ~$5.70/mo (≈ ₹480) | a few rupees/day when in use |
| 3 GB volume | ~$0.45/mo (≈ ₹40) | same |

Auto-stop is enabled in `fly.toml`, so the VM **sleeps when idle** and only bills while it's serving traffic. For 2–3 reels of testing with your friend, expect **~₹0–50 total**.

Fly gives a $5/month free credit to new accounts on a Hobby plan — that easily covers a few days of testing.

## When you want to take it down
```bash
fly destroy reelforge-<your-name> --yes
fly volumes destroy reelforge_data --yes
```
Zero ongoing cost after that.
