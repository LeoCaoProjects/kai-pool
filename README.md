# Kai Pool

Created for the AUT South Campus AI Hackathon 2026.

## About

Kai Pool is our team project for the hackathon's food-waste challenge.
We will choose the final product direction during the event.

This repository contains the starting environment for the frontend and
backend. It does not include a database, authentication, or an AI provider yet.

## Built with

- React Native
- Expo
- TypeScript
- Java 21
- Spring Boot
- Gradle

## Running locally

Node.js, npm, Java 21, and Git are required. Expo Go is useful for testing
on a phone.

Start the backend:

```bash
cd backend
./gradlew bootRun
```

On Windows, use `./gradlew.bat bootRun` instead.

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

## Team workflow

- Pull the latest changes before starting
- Create a `feature/<name>` or `fix/<name>` branch
- Make focused commits
- Push the branch and open a pull request
- Do not commit directly to `main`
