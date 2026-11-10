# Hussel

A one-page, mobile-first web app that organises a weekly tennis meetup into
30-minute doubles rounds on a limited set of courts. No accounts, no backend
- an organiser runs the whole evening from one phone or tablet.

See `PLAN.md` for the full design/requirements and `TASKS.md` for the
build log and known limitations. `CLAUDE.md` has the conventions this
codebase follows.

## Running it

```
npm install
npm run dev        # dev server with hot reload
npm test           # Vitest
npm run typecheck  # tsc --noEmit
npm run build      # production build to dist/
```

## Deploying

Pushing to `master` runs `.github/workflows/deploy.yml`, which builds, runs
the test suite, and deploys `dist/` to GitHub Pages. In the repo's GitHub
settings, Pages must be set to deploy from "GitHub Actions" (Settings ->
Pages -> Source) for this to take effect; the workflow itself needs no
further setup.

## Backing up your data

Everything - the roster, defaults, and the current session - lives in this
browser's `localStorage` only. There's no server and no sync between
devices. Use the **Export JSON** button in the ☰ menu regularly, and
especially before clearing site data, switching browsers, or getting a new
phone. **Import JSON** in the ☰ menu restores from that file, replacing
everything currently stored.

Closing a session (also in the ☰ menu) is intentionally one-way for
privacy: it appends `{date, players, courts, rounds}` to history and
discards the attendance list, the schedule, and every name from that
session. The club roster (names + skill levels) is unaffected.

## What the scheduler does

`src/scheduler/` is a pure, dependency-free TypeScript module (no DOM, no
storage) that decides who plays which round:

1. **Time grid** - `computeTimeGrid` turns start/end time + game length + gap
   into a list of 30-minute (or whatever length) rounds, dropping a trailing
   partial round if the window doesn't divide evenly.
2. **Who plays** - for each round, `selectPlayers` picks `4 * min(courts,
   floor(present / 4))` players by fewest games played so far, then longest
   wait since they last played (a player who hasn't played yet this session
   counts as having waited the longest), then a random tiebreak. Skill level
   never factors into this decision - fairness always decides who's on
   court.
3. **How they're grouped** - `splitIntoGames` splits the chosen players into
   foursomes and teams by minimising a weighted penalty: an odd number of
   beginners in a game, two beginners paired together instead of split
   across teams, four beginners in one game, unbalanced team skill, repeat
   partners/opponents from earlier in the night, and playing the same court
   as last round - in roughly that priority order. A small randomised hill
   climb (swap one or two players between courts, keep it if it lowers the
   total penalty) improves on the initial grouping. None of this can ever
   bump a player who's due to play off the court; it only shapes how the
   already-chosen players are arranged.
4. **Explanations** - when a round isn't ideal (e.g. an odd beginner count
   because the numbers forced it), the scheduler attaches a code like
   `{code: 'ODD_BEGINNERS', params: {n: 3}}` to the game. The scheduler
   itself has zero UI strings; `src/explain.ts` translates codes to text for
   display.
5. **Planning across rounds** - `planFrom(roundIndex)` regenerates every
   unlocked round from `roundIndex` onward (locked rounds and anything
   before `roundIndex` are left untouched), deriving games-played/wait/
   partner/opponent history purely from the rounds it's keeping. A player
   who leaves just stops appearing in future rounds; a late arrival starts
   at zero games and naturally rises to the top of the fairness queue.

A seeded PRNG (`src/scheduler/rng.ts`) makes every test deterministic;
`src/schedule.ts` is the thin, impure layer that feeds the current session's
roster/config into the scheduler and writes the result back into storage.
