# SOC2 Readiness Deployment Checklist

This checklist is organized into three phases. Phase 1 is mandatory before the first school pilot. Phase 2 builds audit-ready habits during pilot operations. Phase 3 is formal audit preparation before Type II.

## Phase 1: Pre-Pilot Essentials

### Infrastructure & Access
- Enable MongoDB Atlas Data Encryption at Rest (AES-256, enabled by default on dedicated clusters)
- Enable MongoDB Audit Logging → stream to SIEM or CloudWatch
- Enforce IP allowlisting on Atlas cluster (only your Vercel/AWS egress IPs)
- Disable password auth on Atlas; use SCRAM-256 or LDAP via SSO only
- Rotate all secrets (DB URI, KMS keys, OAuth secrets) into a secrets manager (AWS Secrets Manager or Vercel environment variables with encryption)
- Create separate DB users per environment: `dev_readwrite`, `staging_readwrite`, `prod_readonly_app`, `prod_admin_breakglass`

### Application Security
- Enforce HTTPS everywhere (Vercel/AWS ALB redirect HTTP → HTTPS)
- Set secure cookie flags: `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`
- Implement rate limiting on auth endpoints (e.g. Vercel Edge Middleware)
- Enable Content Security Policy (CSP) headers via Next.js middleware
- Add request ID middleware for end-to-end traceability in logs
- Sanitize all logs — never log PII, tokens, passwords, or full request bodies
- Configure Field-Level Encryption for all PII fields

### Vendor & Legal
- Sign DPA with MongoDB Atlas
- Sign DPA with Vercel/AWS and any other subprocessors
- Draft and publish Privacy Policy (GDPR + FERPA-compliant language)
- Draft and publish Terms of Service including liability limitations
- Execute pilot agreements with each school including:
  - FERPA responsibility matrix (you are "school official" under FERPA)
  - Data retention terms (auto-delete student data X days after graduation/withdrawal)
  - Breach notification SLA (typically 48-72 hours)
  - Sub-processor disclosure list

### Incident Response
- Document Incident Response Plan (even a 2-page doc is fine for Type I)
- Designate on-call responder for security incidents
- Create `security@yourdomain.com` mailbox monitored daily
- Pre-draft breach notification templates for students, parents, and schools

## Phase 2: Build Audit-Ready Habits (During Pilot)

### Identity & Access Management
- Enforce MFA for all admin/developer accounts (GitHub, Vercel, Atlas, AWS)
- Implement RBAC in your app: `student`, `captain`, `coach`, `school_admin`, `platform_admin`
- Quarterly access reviews — remove departed employees' access within 24h of termination
- Maintain an asset inventory (list of all systems, owners, data classifications)

### Change Management
- Require PR reviews for all production code merges
- Enable branch protection on `main` with status checks (lint, tests, security scan)
- Run SAST on every PR (GitHub Advanced Security, Semgrep, etc.)
- Run dependency scanning weekly (Dependabot or Snyk)
- Maintain a change log (git history satisfies this)

### Monitoring & Logging
- Centralize logs in one place (Datadog, CloudWatch Logs, Axiom, etc.)
- Set up alerts for: failed login spikes, admin role escalations, bulk data exports, error rate > 1%
- Retain logs for 1 year minimum
- Track the `audit_logs` collection and back it up separately from app data

### Training
- Security awareness training for all team members (annual, documented)
- Role-specific training for admins handling student data
- Maintain training records with completion dates

## Phase 3: Pre-Audit Formalization (Before Type II)

### Policies
- Information Security Policy
- Access Control Policy
- Data Classification & Handling Policy
- Incident Response Policy
- Business Continuity / Disaster Recovery Plan
- Secure Development Lifecycle (SDLC) Policy
- Vendor Risk Management Policy
- Data Retention & Disposal Policy
- Encryption & Key Management Policy
- Remote Work / BYOD Policy (if applicable)

### Evidence Collection
- Implement automated evidence collection via Vanta, Drata, or Secureframe
- Conduct quarterly vulnerability scans
- Perform annual penetration testing by a qualified third party
- Conduct annual risk assessments with documented treatment plans

### Technical Controls Validation
- Test backups quarterly and document restore results
- Conduct an annual disaster recovery drill
- Review encryption key rotation schedule annually
- Validate FERPA compliance with school legal teams annually
