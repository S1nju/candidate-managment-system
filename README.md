# Candidate Management & Contract Automation System

A robust, enterprise-grade Candidate Management and Contract E-Signing platform. Built with a **Domain-Driven Laravel 12 Backend** and a modern **Next.js 16 (App Router) Frontend** with a centralized Global API Service layer.

---

## 🎯 Point of the Codebase

The platform streamlines candidate onboarding, document generation, and digital identity verification:
1. **Candidate Onboarding & Form Builder**: Dynamic form creation, custom fields, role-based form assignments, and public candidate submission portals.
2. **Automated Contract Generation & E-Signing**: Template-based PDF generation (via TCPDF/FPDI), real-time document locking, canvas-based digital signatures, and public tokenized signing links.
3. **Identity Verification Integration**: Third-party biometric identity verification via **Didit SDK** integration.
4. **Role-Based Access Control (RBAC)**: Fine-grained user permissions and role filtering powered by `spatie/laravel-permission`.
5. **Audit Logging & Analytics**: Complete activity trail (`AuditLog`) for tracking system actions and visual candidate analytics dashboards.

---

## 📂 Project Structure

```
candidate-managment-system/
├── src/
│   ├── backend/                      # Laravel 12 Domain-Driven Modular API
│   │   ├── app/
│   │   │   ├── Console/              # Artisan commands
│   │   │   ├── Http/Middleware/      # Global API middleware
│   │   │   ├── Mail/                 # Transactional Email Notification templates
│   │   │   ├── Models/               # Core models (User)
│   │   │   ├── Modules/              # Domain-Driven Modules
│   │   │   │   ├── Analytics/        # Analytics endpoints & metrics
│   │   │   │   ├── Audit/            # System audit logs & filtering
│   │   │   │   ├── Auth/             # Sanctum authentication & login
│   │   │   │   ├── Candidates/       # Candidate CRUD, contracts & Didit verification
│   │   │   │   ├── Forms/            # Dynamic forms, fields & contract templates
│   │   │   │   ├── Notifications/    # In-app notifications
│   │   │   │   ├── Signing/          # Digital signatures & document signing
│   │   │   │   └── Users/            # User administration, roles & permissions
│   │   │   └── Providers/
│   │   │       └── ModuleServiceProvider.php # Auto-registers module routes/migrations
│   │   ├── config/                   # Laravel configurations
│   │   ├── database/                 # Migrations & seeders
│   │   └── routes/                   # Core API routes loader
│   │
│   └── frontend/                     # Next.js 16 App Router Frontend
│       ├── app/                      # Next.js App Router pages
│       │   ├── (auth)/login/         # Authentication view
│       │   ├── apply/[uuid]/         # Public candidate application portal
│       │   ├── candidate/sign/[token]/ # Tokenized public candidate signing view
│       │   └── dashboard/            # Admin & Recruiter dashboard layout & sub-pages
│       ├── components/               # UI components
│       │   ├── candidates/           # Candidate detail & list cards
│       │   ├── dashboard/            # Dashboard analytics charts & widgets
│       │   ├── forms/                # Form builder & contract layout editor
│       │   ├── signing/              # Signature pad & PDF viewer
│       │   └── ui/                   # Reusable UI primitives (Shadcn/Radix UI)
│       ├── context/                  # Language & global context providers
│       ├── hooks/                    # Custom React hooks (useAuth, useMobile, useToast)
│       └── services/api/             # Global Centralized API Layer
│           ├── client.ts             # Axios client with CSRF token interceptors
│           ├── auth.api.ts           # Auth domain API
│           ├── candidates.api.ts     # Candidates domain API
│           ├── forms.api.ts          # Forms domain API
│           ├── users.api.ts          # Users domain API
│           ├── signing.api.ts        # Signing domain API
│           ├── analytics.api.ts      # Analytics domain API
│           ├── audit.api.ts          # Audit domain API
│           ├── notifications.api.ts  # Notifications domain API
│           └── index.ts              # Global API exporter
└── README.md
```

---

## 🎭 Use Case Model

```mermaid
graph TD
    subgraph System ["Candidate Management System"]
        UC1["Manage Forms & Fields"]
        UC2["Create Email Contract Invite"]
        UC3["Generate Candidate Contract PDF"]
        UC4["Public Candidate E-Signing"]
        UC5["Biometric Identity Verification (Didit)"]
        UC6["Review Candidate Submissions"]
        UC7["Track System Audit Logs"]
        UC8["View Recruitment Analytics"]
        UC9["User & Role Administration"]
    end

    Admin(("Admin User"))
    Recruiter(("Recruiter / Manager"))
    Candidate(("Candidate / Applicant"))

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC6
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9

    Recruiter --> UC2
    Recruiter --> UC3
    Recruiter --> UC6
    Recruiter --> UC8

    Candidate --> UC4
    Candidate --> UC5
```

---

## 📐 Class Model (Domain Entity Relationships)

```mermaid
classDiagram
    class User {
        +int id
        +string name
        +string email
        +boolean force_password_reset
        +roles()
    }

    class Candidate {
        +int id
        +int form_id
        +int assigned_to
        +string name
        +string email
        +string contract_status
        +string signing_token
        +dateTime sent_for_signature_at
        +dateTime signed_at
        +json data
        +signature()
        +form()
        +generatedContracts()
    }

    class Form {
        +int id
        +int role_id
        +string uuid
        +string title
        +string description
        +fields()
        +contracts()
    }

    class FormField {
        +int id
        +int form_id
        +string label
        +string type
        +boolean is_required
    }

    class FormContract {
        +int id
        +int form_id
        +string title
        +string template_path
    }

    class GeneratedContract {
        +int id
        +int candidate_id
        +int form_contract_id
        +string file_path
        +string status
    }

    class DocumentSignature {
        +int id
        +int candidate_id
        +int user_id
        +string signature_path
        +string ip_address
    }

    class CandidateVerification {
        +int id
        +int candidate_id
        +string didit_session_id
        +string status
        +json decision_data
    }

    class AuditLog {
        +int id
        +int user_id
        +string action
        +string auditable_type
        +int auditable_id
        +string ip_address
    }

    User "1" -- "*" Candidate : assigns
    Form "1" -- "*" Candidate : creates
    Form "1" -- "*" FormField : contains
    Form "1" -- "*" FormContract : template_for
    Candidate "1" -- "*" GeneratedContract : produces
    Candidate "1" -- "0..1" DocumentSignature : signs
    Candidate "1" -- "0..1" CandidateVerification : verifies
    User "1" -- "*" AuditLog : performs
```

---

## 🔄 Sequence Models for Workflows

### 1. Candidate Invitation & Public E-Signing Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin/Recruiter
    participant FE as Next.js Frontend
    participant API as Laravel API (Candidates)
    participant Mail as Mail Service
    actor Cand as Candidate

    Admin->>FE: Initiate Email Contract Invite
    FE->>API: POST /api/candidates/email-contracts
    API->>API: Create Candidate & Generate Signing Token
    API->>Mail: Send CandidateSignatureRequest Email
    API-->>FE: 201 Invite Sent Response
    Mail-->>Cand: Receive Email with Token Link
    
    Cand->>FE: Open /candidate/sign/[token]
    FE->>API: GET /api/public/candidate/{token}
    API-->>FE: Return Candidate & Preview Data
    
    Cand->>FE: Draw Signature & Confirm Sign
    FE->>API: POST /api/public/candidate/{token}/sign
    API->>API: Save DocumentSignature & Update Status to 'signed'
    API-->>FE: Signature Success Response
```

---

### 2. Form Submission & Contract Generation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Cand as Public Applicant
    participant FE as Frontend Portal
    participant API as Laravel API (Forms/Candidates)
    participant Service as ContractGenerationService
    participant Storage as Secure Disk Storage

    Cand->>FE: Submit Public Application Form (/apply/[uuid])
    FE->>API: POST /api/public/forms/{uuid}/submit
    API->>API: Validate & Create Candidate Record
    API->>Service: Trigger Contract Generation
    Service->>Storage: Render PDF Template with Candidate Data
    Storage-->>Service: Generated PDF File Path
    Service->>API: Save GeneratedContract Entry
    API-->>FE: Application Submitted Successfully
```

---

### 3. Didit Biometric Identity Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor Cand as Candidate
    participant FE as Frontend
    participant API as Candidates Module
    participant Didit as Didit Identity SDK

    Cand->>FE: Click "Verify Identity"
    FE->>API: Request Identity Verification Session
    API->>Didit: Create Verification Session
    Didit-->>API: Return Session URL & Session ID
    API-->>FE: Redirect Candidate to Didit Portal
    Cand->>Didit: Complete Liveness / ID Document Scan
    Didit->>API: Webhook GET /api/candidates/verify-callback
    API->>API: Store CandidateVerification Result
    FE->>API: GET /api/candidates/didit-decision/{sessionId}
    API-->>FE: Return Verification Approval Status
```

---

## ⚡ Quick Start & Setup

### Backend (Laravel 12)
```bash
cd src/backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

### Frontend (Next.js 16)
```bash
cd src/frontend
npm install
cp .env.local.example .env.local
npm run dev
```
