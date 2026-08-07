# Kai Pool

Created for the AUT South Campus AI Hackathon 2026.

## About

Kai Pool is our team project for the hackathon's food-waste challenge.
We will choose the final product direction during the event.

This repository contains the shared app foundation, food-pool management,
AI food recognition, nearby collaborative matching, and cached recipe generation.

## Built with

- React Native
- Expo
- TypeScript
- Java 21
- Spring Boot
- Gradle
- PostgreSQL
- Gemini

## Collaborative meal images

The Matches page always has an immediate representative meal image from the
local presentation catalogue. Creating the three complete recipes then follows
this order:

1. Look for a relevant existing meal photograph in TheMealDB.
2. Optionally generate at most one missing hero image with Cloudflare Workers AI.
3. Fall back to the closest local meal-category photograph.

Recipe responses, image choices, and any generated image bytes are cached. Merely
opening or refreshing the Matches page never calls Gemini, TheMealDB, or an image
generation model.

The free TheMealDB development key is enabled in `backend/.env.example`. Before a
public production release, replace it with a supporter key. Cloudflare generation
is optional: set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to enable it,
or leave both blank to keep the fully functional free fallback path.

## Running locally

Node.js, npm, Java 21, and Git are required.

Create `backend/.env` from `backend/.env.example` once, then add the Supabase
Session pooler details and Gemini API key. After that, run this from the project
folder on Windows:

```powershell
.\start.cmd
```

This starts the backend, waits for it, detects the computer's local IP, and
starts Expo. Scan the displayed QR code with the iPhone Camera app. Keep the
computer and phone on the same network.

## Demo accounts

All seeded development accounts use the password `123456`. See [DEMO_USERS.md](DEMO_USERS.md)
for the complete test-account list.

- `aroha@kaipool.nz`
- `sione@kaipool.nz`
- `priya@kaipool.nz`
- `mei@kaipool.nz`

## Team workflow

- Pull the latest changes before starting
- Create a `feature/<name>` or `fix/<name>` branch
- Make focused commits
- Push the branch and open a pull request
- Do not commit directly to `main`
