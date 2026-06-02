# Database Setup Guide

## ✅ Fixed Issues

The following Drizzle ORM issues have been resolved:

1. **Schema Conflicts**: Removed conflicting SQL initialization scripts
2. **Migration Issues**: Updated to latest drizzle-kit (v0.31.4)
3. **Docker Integration**: Streamlined database setup in Docker
4. **Seed Data**: Proper seed script using Drizzle instead of raw SQL

## 🚀 Quick Start

### For Docker Deployment (Recommended)

```bash
# Build and start the application
npm run docker:build
npm run docker:up

# Check logs
npm run docker:logs
```

The Docker setup will automatically:
1. Wait for PostgreSQL to be ready
2. Apply database schema using Drizzle
3. Seed initial compliance frameworks
4. Start the application

### For Local Development

1. Start a local PostgreSQL instance
2. Copy `.env.local` to `.env` and update DATABASE_URL to use `localhost`
3. Run database setup:

```bash
npm run db:setup
```

## 📋 Available Database Commands

- `npm run db:generate` - Generate new migrations from schema changes
- `npm run db:push` - Push schema changes directly (development)
- `npm run db:migrate` - Run migrations using custom script
- `npm run db:seed` - Seed database with initial data
- `npm run db:setup` - Complete setup (migrate + seed)
- `npm run db:test` - Test database connection
- `npm run db:studio` - Open Drizzle Studio (GUI)

## 🔧 Schema Management

Your schema is defined in `shared/schema.ts`. When you make changes:

1. **For Development**: Use `npm run db:push` for quick iteration
2. **For Production**: Generate migrations with `npm run db:generate`

## 🐳 Docker Environment

The Docker setup uses:
- PostgreSQL 15 Alpine
- Automatic schema application on startup
- Health checks for database readiness
- Proper dependency management

## 🌱 Seed Data

Initial compliance frameworks are automatically created:
- GDPR (General Data Protection Regulation)
- SOC2 (SOC 2 Type II)
- EU_AI_ACT (EU AI Act)

## 🔍 Troubleshooting

If you encounter issues:

1. **Check database logs**: `docker-compose logs db`
2. **Check app logs**: `npm run docker:logs`
3. **Test connection**: `npm run db:test` (after containers are up)
4. **Reset database**: `npm run docker:down` then `npm run docker:up`

## 📊 Database Schema

Your database includes these tables:
- `users` - User accounts and subscriptions
- `policies` - Compliance policies and documents
- `compliance_frameworks` - GDPR, SOC2, EU AI Act tracking
- `compliance_checks` - Individual compliance requirements
- `vendors` - Third-party vendor assessments
- `risk_assessments` - Risk analysis and mitigation
- `audit_reports` - Generated compliance reports
- `document_versions` - Policy version history
- `audit_logs` - System activity tracking

All tables are properly linked with foreign keys and include appropriate indexes for performance.