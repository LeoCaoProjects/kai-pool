# Kai Pool

Created for the AUT South Campus AI Hackathon 2026.

## About

Kai Pool is our team project for the hackathon's food-waste challenge.
We will choose the final product direction during the event.

This repository contains the shared app foundation and AI food recognition.
Matching and marketplace features are not implemented yet.

## Built with

- React Native
- Expo
- TypeScript
- Java 21
- Spring Boot
- Gradle
- PostgreSQL
- Gemini

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

All demo accounts use the password `password123`:

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
