# Youth Desk — Municipal Assembly

A private system for the municipality's Youth Desk office.

**Two doors:**

Public (no login):
- `/report` — report an issue (anonymous allowed) → instant case number
- `/track` — track a case by its number
- `/programs` — opportunities the desk announces

Officer (login at `/login`):
- `/dashboard` — case queue: new / in progress / forwarded / resolved; search; open a case to add notes, start working, forward (records the hand-off), resolve
- `/dashboard/youth` — walk-in youth register (cards with serials, searchable)
- `/dashboard/report` — monthly report pack for the MCD / investor (cases by area, by type, resolved rate; printable)
- `/slip/CASE-NUMBER` — printable case slip (the desk can print it for walk-ins)

## Run

```
npm install
npx prisma db push
npm run dev
```

Database: SQLite at `prisma/dev.db` (private to this system; for live deployment, this becomes the Youth Desk's own dedicated Neon Postgres — not shared with anything).

## Officer account

Created by the owner:
```
node scripts/seed_officer.cjs <username> <password> "Full Name"
```

Deployed credentials live only in the gitignored `.env` (SESSION_SECRET).

## Case numbers

`YD-YYYY-NNNN` — permanent references, given to the youth; never reused or renumbered.
Youth serials: `YTH-NNNNN`.

## Safeguarding

Anonymous reporting is supported by design. Sensitive cases are a category the officer can forward to DOVVSU / Social Welfare; the hand-off is recorded on the case.
