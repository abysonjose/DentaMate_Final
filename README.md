# DentaMate_Final
DentaMate is an AI-powered smart dental clinic automation system designed to streamline patient care, appointments, diagnostics, and clinic operations using intelligent technologies like symptom analysis, QR/NFC check-ins, and e-prescriptions.

## Quick Start

### 1. Setup Central Admin (First Time Setup)

Before using the system, create a central admin account:

```bash
# Install dependencies
npm install

# Create central admin
npm run seed:admin
```

**Default Login Credentials:**
- Email: `admin@dentamate.com`
- Password: `Admin@123456`
- Role: `central-admin`

⚠️ **Important**: Change the default password after first login!

### 2. Start the System

```bash
# Start all services
npm run dev

# Or build and start
npm run dev:build
```

### 3. Access the Application

- **Frontend**: http://localhost:4200
- **API Gateway**: http://localhost:3000
- **Auth Service**: http://localhost:3001

## Central Admin Features

The central admin has access to:
- 🏢 **Multi-tenant Management**: Create and manage clinic organizations
- 👥 **User Management**: Manage users across all tenants
- 🏥 **Branch Administration**: Oversee all clinic branches
- 📊 **System Analytics**: Global system insights and reports
- ⚙️ **System Configuration**: Global settings and feature flags
- 🔍 **Audit & Monitoring**: System-wide audit logs and monitoring

## Documentation

- [Central Admin Setup Guide](CENTRAL_ADMIN_SEED_GUIDE.md) - Detailed setup instructions
- [Build and Run Guide](BUILD_AND_RUN.md) - Development setup
- [Quick Start Guide](QUICK_START.md) - Getting started quickly
