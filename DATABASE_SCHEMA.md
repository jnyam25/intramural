# MongoDB Atlas Database Schema

This schema is designed for a multi-tenant platform where users can hold scoped roles across one or more schools. Use referencing for shared data and keep immutable documents for audit-sensitive records.

## 1. `schools`
Top-level tenant container for every customer.

```json
{
  "_id": "ObjectId",
  "name": "String",
  "slug": "String",
  "domain": "String | null",
  "school_type": "k12 | college | university",
  "timezone": "String",
  "academic_year_start": "Date",
  "contact_email": "String",
  "settings": {
    "require_parent_waiver_for_minors": "Boolean",
    "allow_cross_sport_participation": "Boolean",
    "default_scoring_system_id": "ObjectId | null"
  },
  "status": "trial | active | suspended | archived",
  "created_at": "Date"
}
```

- `slug` is URL-safe and unique per school.
- `domain` can be used for SSO / email enforcement.
- `settings` allow school-level customization without hardcoding logic.

## 2. `sports`
Catalog of sports available on the platform.

```json
{
  "_id": "ObjectId",
  "name": "String",
  "slug": "String",
  "icon_url": "String | null",
  "default_team_size_min": "Number",
  "default_team_size_max": "Number",
  "requires_referee": "Boolean",
  "allows_ties": "Boolean",
  "default_match_duration_minutes": "Number",
  "default_scoring_system_id": "ObjectId",
  "metadata": "Object | null"
}
```

- Sport catalog data is shared across schools.
- School-specific rule overrides live on `scoring_systems` or league configuration.

## 3. `scoring_systems`
Composable scoring systems that can be global or school-scoped.

```json
{
  "_id": "ObjectId",
  "school_id": "ObjectId | null",
  "name": "String",
  "points": {
    "win": "Number",
    "tie": "Number",
    "loss": "Number",
    "forfeit_loss": "Number | null",
    "forfeit_win": "Number | null"
  },
  "tiebreakers": [
    "head_to_head",
    "point_differential",
    "points_for",
    "points_against_inverse",
    "wins",
    "quality_wins"
  ],
  "allows_ties": "Boolean",
  "uses_sets": "Boolean"
}
```

- `school_id` null means a global/system scoring profile.
- Tiebreakers are applied in array order.

## 4. `role_assignments`
Scoped role grants for authorization.

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "school_id": "ObjectId",
  "role": "school_admin | sports_admin | league_admin | coach | referee | captain | participant",
  "scope": {
    "sport_id": "ObjectId | null",
    "league_id": "ObjectId | null",
    "team_id": "ObjectId | null"
  },
  "granted_by_user_id": "ObjectId",
  "granted_at": "Date",
  "revoked_at": "Date | null"
}
```

- This is the authorization source of truth.
- Use `revoked_at` for soft delete and audit retention.
- A user can have multiple active assignments across sports, leagues, and teams.

## 5. `users`
Identity remains central, but membership is scoped by `role_assignments`.

```json
{
  "_id": "ObjectId",
  "sso_provider": "google | microsoft",
  "sso_id": "String",
  "email": "String",
  "first_name": "String",
  "last_name": "String",
  "role": "student | parent | admin | coach",
  "school_ids": ["ObjectId"],
  "is_minor": "Boolean",
  "parent_link": "ObjectId | null",
  "created_at": "Date",
  "updated_at": "Date"
}
```

- `school_ids` is optional but helps identify cross-school users.
- Do not store tenant permissions directly on `users`.

## 6. Tenant-scoped core collections
Every tenant-scoped collection now includes `school_id`.

### `leagues`
```json
{
  "_id": "ObjectId",
  "school_id": "ObjectId",
  "sport_id": "ObjectId",
  "scoring_system_id": "ObjectId",
  "name": "String",
  "season": "String",
  "division": "String | null",
  "max_roster_size": "Number",
  "eligibility_rules": "Object",
  "start_date": "Date",
  "end_date": "Date",
  "status": "draft | registration | active | completed | archived",
  "created_at": "Date"
}
```

### `teams`
```json
{
  "_id": "ObjectId",
  "school_id": "ObjectId",
  "league_id": "ObjectId",
  "name": "String",
  "captain_user_id": "ObjectId",
  "roster": [
    {
      "user_id": "ObjectId",
      "role": "player | manager",
      "joined_at": "Date"
    }
  ],
  "status": "forming | full | approved"
}
```

### `waiver_templates`
```json
{
  "_id": "ObjectId",
  "school_id": "ObjectId",
  "version": "Number",
  "title": "String",
  "body_html": "String",
  "is_active": "Boolean",
  "created_at": "Date"
}
```

### `waiver_signatures`
```json
{
  "_id": "ObjectId",
  "school_id": "ObjectId",
  "user_id": "ObjectId",
  "waiver_template_id": "ObjectId",
  "league_id": "ObjectId",
  "signed_at": "Date",
  "ip_address": "String",
  "user_agent": "String",
  "is_parent_signature": "Boolean",
  "signer_user_id": "ObjectId | null",
  "signature_hash": "String"
}
```

### `score_submissions`
```json
{
  "_id": "ObjectId",
  "school_id": "ObjectId",
  "match_id": "ObjectId",
  "submitted_by_user_id": "ObjectId",
  "submitted_by_team_role": "home | away",
  "home_team_score": "Number",
  "away_team_score": "Number",
  "submitted_at": "Date",
  "ip_address": "String",
  "photo_url": "String | null",
  "status": "pending | approved | disputed",
  "admin_notes": "String | null"
}
```

## 7. `matches`
Stores scheduled games between teams.

```json
{
  "_id": "ObjectId",
  "school_id": "ObjectId",
  "league_id": "ObjectId",
  "home_team_id": "ObjectId",
  "away_team_id": "ObjectId",
  "scheduled_at": "Date",
  "location": "String",
  "week_number": "Number",
  "status": "scheduled | in_progress | pending_score_approval | completed | disputed",
  "created_at": "Date"
}
```

- Match records are used for scheduling, score submission, and approval workflows.

## 8. `audit_logs`
SOC2-required audit trail for critical state changes.

```json
{
  "_id": "ObjectId",
  "timestamp": "Date",
  "actor_user_id": "ObjectId",
  "action": "TEAM_APPROVED | WAIVER_SIGNED | ROSTER_ADDED | TEAM_CREATED | INVITE_CREATED | ROSTER_JOINED | ROSTER_APPROVED | ROSTER_REMOVED | SCORE_SUBMITTED | SCORE_APPROVED",
  "entity_type": "team | waiver_signature | registration | match | score_submission",
  "entity_id": "ObjectId",
  "metadata": "Object"
}
```

- `metadata` is a flexible payload for previous/new state, reason codes, or request context.

## Important Design Notes

- Centralize PII in `users` and avoid duplicating personal data across documents.
- Use `role_assignments` for authorization rather than embedding tenant roles in `users`.
- Keep signed waiver documents immutable for audit and compliance.
- Store school-scoped versions of waiver templates, leagues, and score submissions.
- Use `school_id` as the tenant boundary for every tenant-scoped collection.

## Index Strategy for Tenant Isolation

Every tenant-scoped collection should use compound indexes that begin with `school_id`.
This ensures queries are efficiently narrowed to a single tenant and protects against accidental cross-tenant scans.

- `users`: `{ school_id: 1, email: 1 }`, `{ school_id: 1, sso_id: 1 }`
- `leagues`: `{ school_id: 1, sport_id: 1 }`, `{ school_id: 1, status: 1 }`
- `teams`: `{ school_id: 1, league_id: 1 }`, `{ school_id: 1, "roster.user_id": 1 }`
- `matches`: `{ school_id: 1, league_id: 1 }`, `{ school_id: 1, scheduled_at: -1 }`
- `waiver_templates`: `{ school_id: 1, is_active: 1 }`
- `waiver_signatures`: `{ school_id: 1, user_id: 1 }`, `{ school_id: 1, league_id: 1 }`
- `score_submissions`: `{ school_id: 1, match_id: 1 }`, `{ school_id: 1, submitted_by_user_id: 1 }`
- `team_invites`: `{ school_id: 1, team_id: 1 }`, `{ school_id: 1, expires_at: 1 }`
- `role_assignments`: `{ user_id: 1, school_id: 1, revoked_at: 1 }`
- `audit_logs`: `{ school_id: 1, timestamp: -1 }`
- `scoring_systems`: `{ school_id: 1, name: 1 }`
