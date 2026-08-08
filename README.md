# Kai Pool

> *Kia ora, ko Shyam tōku ingoa.*<br>
> *Me tīmata ahau ki tētahi mea, tata ki toku ngakau.*<br>
> *Nō Inia ahau, he manene hoki,*<br>
> *Engari, kaore ano toku hono ki Aotearoa kia tino kaha.*
>
> *Hello everyone.*<br>
> *My name is Shyam, and I'm from an Indian migrant background.*<br>
> *When I first arrived in Aotearoa, one of the hardest things was finding a sense of belonging.*<br>
> *Personally, I found that belonging with food.*<br>
> *It helped me feel more connected to my hapori.*
>
> *That experience inspired us to create Kai Pool: kai meaning food, and pool meaning to share.*<br>
> *It brings cultures, communities, and people together over food.*

Created in 48 hours for the **AUT AI Hackathon Festival 2026** food waste
challenge. **Awarded second place overall.**

## About

Kai Pool is a community app designed to reduce household food waste and
create meaningful local connections. It turns surplus ingredients into
opportunities to share kai, cook together, and strengthen the community.

Users photograph their pantry or fridge, review the ingredients identified
by AI, and add them to a personal food pool. Items marked for giveaway
appear on a nearby map where another user can collect them. Kai Pool also
matches people through proximity and available ingredients, suggests meals
they can prepare together, and supports planning a cookout.

Kai Pool is guided by **manaakitanga**, care and generosity towards others,
and **whanaungatanga**, relationships built through shared experiences. It
depends on people choosing to share kai and build connections within their
hapori.

## How it works

- Photograph food and review the ingredients recognised by AI
- Keep a personal food pool and mark unwanted items for giveaway
- Find nearby kai on an interactive map and collect an available listing
- Discover people through distance, ingredient overlap, food cultures,
  and suggested meals
- Send a Cook Together request, accept a connection, and arrange a cookout

## Built with

- React Native
- Expo
- TypeScript
- Java 21
- Spring Boot
- Gradle
- PostgreSQL and Supabase
- Gemini

## Running locally

Node.js, npm, Java 21, and Git are required.

Copy `backend/.env.example` to `backend/.env`, then add your Supabase
Session pooler details and Gemini API key.

On Windows, run this from the project folder:

```powershell
.\start.cmd
```

On macOS or Linux, run:

```bash
bash start.sh
```

This starts the backend, waits for it to become available, detects the
computer's local IP, and launches Expo. Scan the displayed QR code with
your phone and keep every phone on the same Wi-Fi as the computer. On
Android, open Expo Go and use its **Scan QR code** button. On iPhone, use
the Camera app or Expo Go.

The launcher also prints a phone connection test URL. Open it in each
phone's browser before testing the app. If it does not load, check that the
network is not a guest network and allow Java and Node.js through Windows
Firewall for the current network.

See [DEMO_USERS.md](DEMO_USERS.md) for the seeded local users and login
details.

## Credits

- Leo Cao ([@LeoCaoProjects](https://github.com/LeoCaoProjects)): Developer and designer
- Fateh Bhular ([@fatehbhular](https://github.com/fatehbhular)): Developer and tester
- Shawn Lee ([@ShawnLeeyz](https://github.com/ShawnLeeyz)): Developer
- Shyam Sharma: Business and pitch lead
- Wei-Xiang Yong ([@LongNightOfSolace2552](https://github.com/LongNightOfSolace2552)): Developer
