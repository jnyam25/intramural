# IntraPlay Test Credentials

All test users share the same password: `TestPass123!`

## User Types & Credentials

### 1. Participant (Student Player)
- **Email:** `participant@test.intramural`
- **Password:** `TestPass123!`
- **Role:** `participant`
- **Dashboard:** Player Dashboard — upcoming matches, waiver compliance alerts, standings
- **Access:** Browse leagues, join teams, sign waivers, view schedules

### 2. Captain (Team Captain)
- **Email:** `captain@test.intramural`
- **Password:** `TestPass123!`
- **Role:** `captain`
- **Dashboard:** Team Captain — roster compliance, invite link, match cards with score submission
- **Access:** All participant access + manage team roster, invite players, submit scores
- **Team:** "Test Thunderbolts" (auto-created)

### 3. Coach
- **Email:** `coach@test.intramural`
- **Password:** `TestPass123!`
- **Role:** `coach`
- **Dashboard:** Coach — safety check (waiver gaps), weekly match schedule, message center
- **Nav:** Dashboard, My Teams, Communications, My Profile
- **Access:** View coached teams, broadcast messages to rosters (`/communications`)

### 4. Referee (Match Official)
- **Email:** `referee@test.intramural`
- **Password:** `TestPass123!`
- **Role:** `referee`
- **Dashboard:** Match Official — next 48h assignments, pending score entry, recent incident reports
- **Nav:** Dashboard, My Assignments, Incident Reporting, My Profile
- **Access:** Check in to matches (`/assignments`), file incident reports (`/incidents/new`)

### 5. League Admin
- **Email:** `leagueadmin@test.intramural`
- **Password:** `TestPass123!`
- **Role:** `league_admin`
- **Dashboard:** Player Dashboard (falls back to participant view)
- **Admin Nav:** Overview, Leagues, Teams, Matches, Disputes, Waivers
- **League:** "Test Basketball League" (auto-created)

### 6. Sports Admin
- **Email:** `sportsadmin@test.intramural`
- **Password:** `TestPass123!`
- **Role:** `sports_admin`
- **Dashboard:** Player Dashboard (falls back to participant view)
- **Admin Nav:** Overview, Leagues, Waivers, Officials, SSO

### 7. School Admin
- **Email:** `schooladmin@test.intramural`
- **Password:** `TestPass123!`
- **Role:** `school_admin`
- **Dashboard:** Player Dashboard (falls back to participant view)
- **Admin Nav:** Full access — Overview, Leagues, Waivers, Roles, Reports & Analytics, SSO, Settings
- **Access:** Full admin access to school settings, role assignments, audit logs, reports

### 8. Platform Admin
- **Email:** `platformadmin@test.intramural`
- **Password:** `TestPass123!`
- **Role:** `platform_admin`
- **Dashboard:** Player Dashboard (falls back to participant view)
- **Admin Nav:** All school nav + Platform section: Audit Logs, Schedule, Eligibility

---

## How to Create Test Users

### Option 1: API Endpoint (Recommended)
```bash
curl -X POST http://localhost:3000/api/seed
```

Or view credentials without creating:
```bash
curl http://localhost:3000/api/seed
```

### Option 2: Direct Signup
1. Navigate to: http://localhost:3000/signup
2. Create accounts manually with test emails
3. Assign roles via the admin console (login as `schooladmin@test.intramural`)

## Test Data Auto-Created

When you run the seed endpoint, the following test data is created:

1. **School:** "Test University" (if not exists)
2. **Team:** "Test Thunderbolts" (linked to captain and coach users)
3. **League:** "Test Basketball League" (Fall 2024 season)

## Dashboard & Navigation by Role

| Role | Sidebar Nav | Dashboard Widgets |
|------|-------------|-------------------|
| participant | Dashboard, My Teams, Leagues & Schedules, My Profile | Stats, waiver alerts, upcoming matches |
| captain | Dashboard, My Teams, Leagues & Schedules, My Profile | Roster compliance, invite link, match cards |
| coach | Dashboard, My Teams, Communications, My Profile | Safety check, weekly schedule, message center |
| referee | Dashboard, My Assignments, Incident Reporting, My Profile | 48h assignments, pending scores, incidents |
| league_admin+ | All above + Admin Console link | Role-dependent (based on player roles held) |

## Role Permissions Summary

| Role | View Leagues | Manage Team | Manage League | Officials | Reports | Admin Console |
|------|-------------|-------------|---------------|-----------|---------|---------------|
| participant | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| captain | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| coach | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| referee | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| league_admin | ✅ | ✅ | ✅ | ❌ | ❌ | Limited |
| sports_admin | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| school_admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| platform_admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Security Notes

> **WARNING:** These credentials are for development/testing only.
- The `/api/seed` endpoint is disabled in production
- All test emails use the `@test.intramural` domain
- Change passwords before using in any staging environment
