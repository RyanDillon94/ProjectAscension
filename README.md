# Project 35

Build a mobile-first, dark-themed fitness dashboard called "Project 35". 

The design should evoke a modern, high-performance RPG character sheet using Tailwind CSS, dark slate/charcoal backgrounds (#0f172a), sharp emerald accents (#10b981), and Lucide icons.

Header & Identity:

- App Title: "Project 35: The Undeniable Standard"

- Mission Banner: "Built over years. Ready for everything. Arrive at 35 in undeniable shape."

- Active Phase Badge: "Phase 1: The Cut & The Clock (Block 1: Weeks 1–12)"

- Target Countdown: Months/weeks remaining to November 2029 (Age 35).

Dashboard Hero (Active Block View):

- Daily Non-Negotiables Card:

  * Calories: 2,000 – 2,400 kcal target

  * Protein: 200g+ target

  * Steps: 12,500 target

  * Routine: "6:00 AM Iron → 7:00 AM Dog Walk"

- Daily Habit Checkboxes:

  * [ ] 6:00 AM Gym Session Completed

  * [ ] 12,500 Steps Hit

  * [ ] 200g+ Protein Banked

- Photo Checkpoint:

  * Side-by-side comparison card: "Phase 1 Baseline" vs "Current Phase Photo" with an image upload button.

Metrics & Analytics:

1. Weight Progression Card:

   - Line chart tracking Friday Weekly Average Weight (lbs) starting from current weight down toward a goal line of 190 lbs.

   - A clean "+ Log Friday Weight" modal allowing the user to enter their Friday average and calculate pounds dropped to date.

2. Hevy Integration Card:

   - A section displaying the latest completed workout.

   - Include a "Sync Hevy Workout" button that connects to the Hevy API (GET /v1/workouts using a user-provided API key) to pull workout title, date, exercises, working weight (kg), and sets.

   - Include a simple settings gear modal to save the Hevy API Key locally.

Coach AI Chat Drawer (Floating Action Button or Bottom Nav Tab):

- An embedded chat interface connected to an LLM endpoint (Gemini API).

- Has a prominent quick-action button: "Analyse Last Hevy Workout".

- Clicking this passes the fetched Hevy workout details, current weight trend, and the user's deficit target to the AI.

- AI Persona: Direct, no-fluff, performance coach. Celebrates earned wins, points out stalling lifts, suggests weight promotions or deloads, and gives constructive accountability.

3-Year Macro Roadmap (Phases 1 to 6):

- An accordion or tabbed view laying out six 6-month phases leading to November 2029, within each view(phase) it will have two sub tabs/accordions for the phase blocks. I also want a countdown for each block:

  * Phase 1 (Active): The Cut & The Clock (Establish 6:00 AM habit, drop 30 lbs toward 190 lbs).

  * Phase 2: The Foundation Build (Lean bulk, heavy compound hypertrophy).

  * Phase 3: Athletic Performance (Work capacity, upper yoke development).

  * Phase 4: Hybrid Balance (Conditioning & functional strength).

  * Phase 5: Peak Density (Maximum muscle maturity & leanness).

  * Phase 6: Project 35 (Permanent identity, peak physique at 35).

- Phase 1 active; Phases 2–6 set to upcoming with high-level focus badges (Hypertrophy, Strength, Conditioning).

Ensure the app is fully responsive, touch-friendly, optimized for mobile home screens (PWA), and persists state locally or via Supabase.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/da322f39-8a43-4fcb-a0cb-58fa0f9d80d4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
