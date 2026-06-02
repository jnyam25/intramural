# intramural

This repository follows a vertical slice MVP workflow.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `MONGODB_URI` to your MongoDB Atlas connection string.
3. Set `NEXTAUTH_SECRET` to a secure random value.
5. Set `MONGO_DEK_ID` and `MONGO_LOCAL_MASTER_KEY` for field-level encryption if using MongoDB Queryable Encryption. Generate the master key with: `node -e "console.log(require('crypto').randomBytes(96).toString('base64'))"`
6. Optionally enable `NEXTAUTH_DEBUG=true` for local auth debugging.
7. Run `npm install`.
8. Run `npm run dev`.

## Vercel Environment Variables

Configure the same variables in Vercel for production/staging:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `MONGODB_URI`
- `MONGO_DEK_ID`
- `MONGO_LOCAL_MASTER_KEY`
- `NEXTAUTH_DEBUG` (optional)

## Notes

- The app uses Next.js App Router.
- MongoDB Atlas is connected through `lib/mongodb.ts`.
- NextAuth is configured in `app/api/auth/[...nextauth]/route.ts`.
- CI linting is configured in `.github/workflows/ci.yml`.
- MongoDB schema design is documented in `DATABASE_SCHEMA.md`.
- SOC2 readiness and deployment checklist is documented in `SOC2_READINESS.md`.

See `PROJECT_BOARD.md` for the GitHub Projects board layout, issue template guidelines, and the MVP slice execution plan.

Issue and PR templates are provided under `.github/`.
