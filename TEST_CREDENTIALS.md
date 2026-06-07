# IntraPlay Test Credentials

All test users share the same password: `TestPass123!`

## User Types & Credentials

### 1. Participant (Student Player)
- **Email:** `participant@test.intramural`
- **Password:** `TestPass123!`
- **Role:** `participant`
- **Access:** Can join teams, view leagues, sign waivers, view schedules

### 2. Captain (Team Captain)
- **Email:** `captain@test.intramural`
- **Password:** `TestPass123!`
- **Role:** `captain`
- **Access:** All participant access + manage team roster, schedule matches, invite players
- **Team:** "Test Thunderbolts" (auto-created)

### 3. School Admin
- **Email:** `schooladmin@test.intramural`
- **Password:** `TestPass123!`
- **Role:** `school_admin`
- **Access:** Full admin access to school settings, user role assignments, audit logs, all reports

### 4. Sports Admin
- **Email:** `sportsadmin@test.intramural`
- **Password:** `TestPass123!`
- **Role:** `sports_admin`
- **Access:** Manage leagues, schedules, match results, field assignments

### 5. League Admin
- **Email:** `leagueadmin@test.intramural`
- **Password:** `TestPass123!`
- **Role:** `league_admin`
- **Access:** Manage specific league settings, team registrations, standings
- **League:** "Test Basketball League" (auto-created)

## How to Create Test Users

### Option 1: API Endpoint (Recommended)
```bash
curl -X POST http://localhost:3000/api/seed
```

Or view credentials without creating:
```bash
curl http://localhost:3000/api/seed
```

### Option 2: Web Interface
1. Start the dev server: `npm run dev`
2. Navigate to: http://localhost:3000/auth/signin
3. Sign in with any test email and password `TestPass123!`

### Option 3: Direct Signup
1. Navigate to: http://localhost:3000/signup
2. Create accounts manually with test emails
3. Assign roles via the admin console (login as schooladmin@test.intramural)

## Test Data Auto-Created

When you run the seed endpoint, the following test data is created:

1. **School:** "Test University" (if not exists)
2. **Team:** "Test Thunderbolts" (linked to captain user)
3. **League:** "Test Basketball League" (Fall 2024 season)

## Role Permissions Summary

| Role | View Leagues | Join Teams | Manage Team | Manage League | Manage School | Admin Console |
|------|-------------|------------|-------------|---------------|---------------|---------------|
| participant | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| captain | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| league_admin | ✅ | ✅ | ✅ | ✅ | ❌ | Limited |
| sports_admin | ✅ | ✅ | ✅ | ✅ | Limited | ✅ |
| school_admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Security Notes

⚠️ **WARNING:** These credentials are for development/testing only.
- The `/api/seed` endpoint is disabled in production
- All test emails use the `@test.intramural` domain
- Change passwords before using in any staging environment
