# Kai Pool

Created for the AUT South Campus AI Hackathon 2026.

## About

Kai Pool is our team project for the hackathon's food-waste challenge.
We will choose the final product direction during the event.

This repository contains the shared user, authentication, food-pool, API,
and navigation foundation. AI recognition, matching, and marketplace features
are not implemented yet.

## Built with

- React Native
- Expo
- TypeScript
- Java 21
- Spring Boot
- Gradle
- PostgreSQL

## Running locally

Node.js, npm, Java 21, PostgreSQL, and Git are required. Expo Go is useful
for testing on a phone.

Create a PostgreSQL database named `kai_pool`. Set the variables from
`backend/.env.example` in your terminal, then start the backend:

```bash
cd backend
./gradlew bootRun
```

On Windows, use `./gradlew.bat bootRun` instead.

To try the recipe tester without installing PostgreSQL, start the backend with its
in-memory local database. Its data is discarded when the backend stops:

```bash
cd backend
./gradlew bootRun --args="--spring.profiles.active=local"
```

On Windows PowerShell:

```powershell
.\gradlew.bat bootRun --args="--spring.profiles.active=local"
```

Use the `dev` profile to add the demo accounts and food below. Existing data
is left unchanged.

In a second terminal, start the frontend:

```bash
cd frontend
npm install
npm start
```

You can also use `npm run android`, `npm run ios`, or `npm run web`.

## Using a phone

Copy `frontend/.env.example` to `frontend/.env`. Replace the example IP
address with the local IPv4 address of the computer running the backend.

Keep the phone and computer on the same network, then restart Expo. Do not
commit the `.env` file.

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
