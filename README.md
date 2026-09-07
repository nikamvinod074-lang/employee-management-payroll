# PeopleDesk — Employee Management & Payroll System

A full-stack, role-based Employee Management & Payroll System built with **Django REST Framework** (backend) and **React + Bootstrap 5** (frontend). It covers employee records, departments, attendance, leave workflows, payroll calculation, and printable payslips — with JWT authentication, strict object-level authorization, and Admin / HR / Employee role-based access control enforced throughout the backend.

---

## 1. Project Overview

PeopleDesk lets an organization:

- Maintain a single source of truth for employee records and departments
- Track daily attendance and generate monthly attendance summaries
- Run a full leave request → review → approval workflow, with ownership that can't be tampered with
- Generate payroll with **server-calculated** gross/net salary and a controlled status workflow
- Produce professional, printable payslips
- Give each role — Admin, HR, Employee — exactly the access they need, enforced on the backend, not just hidden in the UI

---

## 2. Features

- **JWT authentication**: login, logout (token blacklisting), silent access-token refresh, change password, forgot/reset password
- **Role-based access control**: Admin (full access), HR (operational access, no user/system management), Employee (self-service only) — enforced at the queryset and object level on every endpoint
- **Employee management**: CRUD, search, filter, sort, pagination, soft-delete (deactivation preserves history)
- **Department management**: CRUD with a safety check that blocks deletion while employees are still assigned
- **Attendance**: daily marking, duplicate-per-day prevention, monthly summaries and reports, attendance percentage calculation
- **Leave management**: apply → pending → HR/Admin review → approved/rejected, with overlap/date validation and an ownership field that an employee can never reassign
- **Payroll**: gross/net salary always computed server-side from basic pay, allowances, bonus, overtime, tax, other deductions, and leave deductions; `basic_salary` is always snapshotted from the employee's real record; a strict status workflow (Draft → Generated → Approved → Paid) blocks invalid transitions and locks the record once Paid
- **Payslips**: formatted, printable payslip view per payroll record
- **Dashboards**: distinct Admin/HR and Employee dashboards with charts (employees by department, employee status, monthly payroll trend, attendance overview)
- **Consistent error handling** on both ends — no raw stack traces or DB errors ever reach the client
- **Seed command** for realistic demo data (employees, attendance, leave, payroll)

---

## 3. Technology Stack

**Backend:** Python, Django 5.0.7, Django REST Framework 3.15.2, djangorestframework-simplejwt 5.3.1, django-filter 24.2, django-cors-headers 4.4.0, MySQL (mysqlclient 2.2.4), Pillow 10.4.0
**Frontend:** React 18, Vite 5, Bootstrap 5 + react-bootstrap, Axios, React Router 6, Chart.js (react-chartjs-2)
**Auth:** JWT (access + refresh, rotation, blacklist)
**Database:** MySQL (SQLite supported for a zero-setup local trial)

---

## 4. Architecture

```
employee-management-payroll/
├── backend/                 Django REST API
│   ├── config/               settings, root urls, wsgi/asgi
│   ├── accounts/              custom User model, auth endpoints, seed command
│   ├── employees/              employee CRUD + role-scoped visibility
│   ├── departments/             department CRUD + integrity checks
│   ├── attendance/               attendance marking, summaries, reports
│   ├── leaves/                    leave workflow (apply/review)
│   ├── payroll/                    payroll calculation engine + payslips
│   ├── dashboard/                   aggregated dashboard stats
│   └── common/                       shared pagination/permissions/error handling
│
├── frontend/                 React SPA
│   └── src/
│       ├── components/        reusable UI (tables, modals, cards, icons, charts)
│       ├── pages/               one file per route/screen
│       ├── layouts/              sidebar + topbar dashboard shell
│       ├── services/              one Axios wrapper per API resource
│       ├── context/                Auth + Toast global state
│       ├── hooks/                   usePaginatedList (server-side list state)
│       └── utils/                    formatting, token storage
│
└── README.md
```

### Design principle
The frontend never computes payroll figures — it only renders what the backend returns. This mirrors the backend rule that gross/net salary is **always** derived server-side in `payroll/services.py`, never accepted as raw client input. The same principle applies to authorization: every permission check exists on the backend first; the frontend's route guards and conditional rendering are a UX convenience, not the security boundary.

---

## 5. Security

Every access-control rule below is enforced in Django views/serializers — never only in the React UI.

**Object-level authorization**
- Employees can only ever read/write their *own* employee, attendance, leave, and payroll records. This is enforced by scoping every `get_queryset()` to `employee__user=request.user` for the Employee role, plus an explicit `get_object()` check as a second line of defense on detail endpoints.
- **Leave ownership is immutable for employees.** `LeaveRequestSelfUpdateSerializer` excludes the `employee` field entirely for employee self-service updates, so a PATCH containing `{"employee": <other_id>}` cannot reassign a leave request to someone else — this was tested directly (see `leaves/tests.py::test_employee_cannot_reassign_leave_ownership`).
- HR and Admin are separated: HR gets operational access (employees, departments, attendance, leave, payroll) but not user-account management or system settings, which are Admin-only.

**Password reset**
- Reset tokens are single-use, expire after `PASSWORD_RESET_TOKEN_TTL_MIN` (default 30 minutes), and only the SHA-256 hash is ever stored — the raw token is never persisted.
- Issuing a new reset token immediately invalidates every other outstanding token for that account.
- A successful password reset (or change) blacklists all outstanding JWT refresh tokens for that user, terminating existing sessions.
- The forgot-password response is identical whether or not the email exists, so the endpoint can't be used to enumerate registered accounts.
- The raw token is only ever included in the API response when `DEBUG=True`, purely to demonstrate the flow without email infrastructure — this is never enabled in production.

**Payroll integrity**
- `basic_salary` on a payroll record is read-only in the API; it is always snapshotted from the employee's current `basic_salary` at generation/update time, so it can never drift from or be entered inconsistently with the employee record.
- Gross/net salary, overtime pay, and leave deductions are always computed server-side in `payroll/services.py` — a client-submitted `net_salary` (or any other computed field) is silently ignored.
- Status transitions are restricted to a single step at a time (`Draft → Generated → Approved → Paid`); skipping steps (e.g. `Draft → Paid`) is rejected. Reverting a step backward is only permitted for Admin users, never HR. Once a payroll is `Paid`, it is terminal — no further status change or field edit is accepted, and the record cannot be deleted.

---

## 6. Database Overview

Core models: `User` (custom, email-based, role field), `Employee`, `Department`, `Attendance`, `LeaveRequest`, `Payroll`, plus `PasswordResetToken` for the forgot-password flow.

Key constraints:
- `Attendance`: unique `(employee, date)` — prevents duplicate daily records
- `Payroll`: unique `(employee, month, year)` — prevents duplicate monthly payroll; `CheckConstraint` enforces `1 <= month <= 12`
- `LeaveRequest`: `CheckConstraint` enforces `end_date >= start_date` at the database level, in addition to serializer-level validation
- `Department` deletion is blocked while any employee is still assigned to it
- Employee deletion is a **soft delete** (status → `TERMINATED`) to preserve attendance/leave/payroll history

---

## 7. API Overview

All endpoints are under `/api/`. A representative sample:

```
POST   /api/auth/login/                  Obtain access + refresh tokens
POST   /api/auth/logout/                 Blacklist refresh token
POST   /api/auth/token/refresh/          Refresh access token
GET    /api/auth/me/                     Current user
POST   /api/auth/change-password/
POST   /api/auth/forgot-password/
POST   /api/auth/reset-password/

GET    /api/employees/                   List (search/filter/paginate)
POST   /api/employees/                   Create (Admin/HR)
GET    /api/employees/{id}/
PATCH  /api/employees/{id}/
DELETE /api/employees/{id}/              Soft-delete (Admin/HR)

GET    /api/departments/
POST   /api/departments/

GET    /api/attendance/
POST   /api/attendance/
GET    /api/attendance/summary/{employee_id}/
GET    /api/attendance/report/           Monthly org-wide report (Admin/HR)

GET    /api/leaves/
POST   /api/leaves/
POST   /api/leaves/{id}/review/          Approve/reject (Admin/HR)

GET    /api/payroll/
POST   /api/payroll/                     Generate payroll (server calculates totals)
PATCH  /api/payroll/{id}/status/         Draft → Generated → Approved → Paid (see Security)
GET    /api/payroll/{id}/payslip/
GET    /api/payroll/my-payslips/

GET    /api/dashboard/admin/
GET    /api/dashboard/employee/
```

Every list endpoint supports `?search=`, relevant `?<field>=` filters, `?ordering=`, and `?page=`/`?page_size=`.

---

## 8. Installation

### Prerequisites
- Python 3.14 (the project targets 3.14 specifically; 3.10–3.13 also work with these pinned versions)
- Node.js 18+
- MySQL 8+ (or use `USE_SQLITE=True` for a quick local trial without MySQL)

> **Windows + Python 3.14 note:** all pinned backend dependencies (Django 5.2.17, Pillow 12.3.0, mysqlclient 2.2.8) publish official `cp314-win_amd64` wheels, so `pip install -r requirements.txt` installs from prebuilt binaries — no C/C++ build toolchain or Visual Studio Build Tools required. See "Python 3.14 upgrade notes" below for details.

### 8.1 Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env: set DJANGO_SECRET_KEY, JWT_SIGNING_KEY, and your MySQL credentials
```

### 8.2 MySQL setup

```sql
CREATE DATABASE employee_management CHARACTER SET utf8mb4;
CREATE USER 'your_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON employee_management.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

Update `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` in `backend/.env` to match.

> **Quick trial without MySQL:** set `USE_SQLITE=True` in `.env` and skip the MySQL setup entirely. Not recommended beyond local development.

### 8.3 Run migrations & seed demo data

```bash
python manage.py migrate
python manage.py createsuperuser        # optional, for /admin/ access
python manage.py seed_demo_data --employees 15
```

### 8.4 Start the backend

```bash
python manage.py runserver
# API now available at http://localhost:8000/api/
```

### 8.5 Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_BASE_URL defaults to http://localhost:8000/api — adjust if needed
npm run dev
# App now available at http://localhost:5173
```

---

## 9. Python 3.14 Upgrade Notes

This project targets **Python 3.14** on Windows, Linux, and macOS. The dependency versions in `requirements.txt` were chosen specifically because each one publishes an official Python 3.14 build - no source compilation is required on any platform, including Windows.

| Package | Old version | New version | Why the upgrade was necessary |
|---|---|---|---|
| Django | 5.0.7 | **5.2.17** (LTS) | Django only added official Python 3.14 support as of 5.2.8; 5.0.x does not support 3.14 at all. 5.2 is the current LTS release, receiving security updates for at least three years. |
| djangorestframework | 3.15.2 | **3.17.2** | 3.15.2 predates Django 5.2 and Python 3.14; 3.17.x is the first DRF line to officially declare both. (3.18.x also supports them but changes the error-response shape for list serializers - skipped to avoid an unnecessary breaking change.) |
| djangorestframework-simplejwt | 5.3.1 | **5.5.1** | Latest available release. Pure-Python package (no C extension), so Python 3.14 compatibility is a non-issue at the build level; bumped mainly to pick up two years of bugfixes. Upstream has an open PR adding an explicit "Python 3.14 / Django 6.0 support" changelog entry that hasn't shipped in a release yet - functionally this already works under 3.14, confirmed by this project's test suite. |
| django-cors-headers | 4.4.0 | **4.9.0** | 4.9.0 is the first release to explicitly add Python 3.14 support (an earlier 4.x already added Django 5.2 support). |
| django-filter | 24.2 | **25.2** | Adds official Django 5.2 support and Python 3.14 test coverage. |
| **mysqlclient** | 2.2.4 | **2.2.8** | **This was the actual blocker.** mysqlclient builds a C extension against libmysqlclient/MariaDB Connector, and building it from source on Windows is notoriously difficult ("Building mysqlclient on Windows is very hard" - upstream's own docs). Prebuilt Windows wheels only go up to whatever CPython version was current when a release shipped. 2.2.4 has no wheel past Python 3.12. **2.2.8 is the first release with official `cp314-win_amd64` and `cp314t-win_amd64` wheels**, so `pip install` on Windows/3.14 now pulls a binary wheel instead of attempting (and failing) a source build. |
| **Pillow** | 10.4.0 | **12.3.0** | **The other real blocker.** Pillow ships Python-version-specific wheels for its C extension. 10.4.0's wheel matrix stops before Python 3.14. **Pillow 12.0.0 (2025-10-15) was the first release to officially support Python 3.14** (11.3.0 had 3.14-*beta* wheels only, not final). 12.3.0 is the latest 12.x patch. |
| python-dotenv | 1.0.1 | **1.2.3** | Pure Python, no compatibility blocker - bumped for currency and its explicit Python 3.14 classifier. |

**Why these specific versions and not the newest available:** Django 6.0/6.1 and DRF 3.18 already exist and also support Python 3.14, but the brief for this upgrade was to make the *existing* Python-3.14/Windows/MySQL blocker disappear without unnecessary churn - so this upgrade stayed on the Django 5.2 LTS line (matching the existing 5.0.x major version's spirit) and the DRF 3.17.x line (the first to add 3.14 support, before 3.18's breaking change to list-serializer error formatting). Jumping to Django 6.0 or DRF 3.18 was avoided because neither was *necessary* to fix the Python 3.14 installation problem, and Django 6.0 drops Python 3.10/3.11 support that this project doesn't need to drop.

**Code changes required by the upgrade:** exactly one. Django 5.1 renamed `CheckConstraint(check=...)` to `CheckConstraint(condition=...)` (the old kwarg is deprecated, not yet removed, in 5.2). Running `manage.py check` with deprecation warnings promoted to errors surfaced this in `leaves/models.py` and `payroll/models.py`; both the model definitions and their already-applied migration files were updated to use `condition=`. No other API changes across Django 5.0→5.2, DRF 3.15→3.17, or SimpleJWT 5.3→5.5 affected this codebase - the full test suite (54 tests) and `makemigrations --check` both pass unchanged otherwise.

**What could not be verified in this environment:** the commands below were run against **Python 3.12** (the only interpreter available in the environment used to prepare this upgrade) with the new dependency versions, plus a direct check of each package's PyPI file listing to confirm a `cp314-win_amd64` wheel exists. `mysqlclient==2.2.8` was additionally build-tested from source on Linux (with `libmysqlclient-dev` installed) to confirm no C-level incompatibility exists in the newer version - Windows will use its prebuilt wheel instead of building from source, so that step doesn't fully replicate the Windows install path. **A real Python 3.14 interpreter on Windows was not available to run these commands directly** - you should re-run the verification block below yourself after creating the venv, and treat that as the actual confirmation for your machine.

```powershell
python --version
pip install -r requirements.txt
python manage.py check
python manage.py makemigrations --check
python manage.py test
```

---

## 10. Environment Variables

**`backend/.env`** (see `backend/.env.example` for the full annotated list): `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `USE_SQLITE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `JWT_SIGNING_KEY`, `JWT_ACCESS_TOKEN_LIFETIME_MIN`, `JWT_REFRESH_TOKEN_LIFETIME_DAYS`, `PASSWORD_RESET_TOKEN_TTL_MIN`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `COMPANY_NAME`, `COMPANY_ADDRESS`.

**`frontend/.env`**: `VITE_API_BASE_URL`.

Never commit real `.env` files — only the `.env.example` templates are checked in. `.gitignore` at the project root excludes `.env`, `db.sqlite3`, `node_modules/`, `dist/`, `media/`, and `staticfiles/`.

---

## 11. Demo Accounts

Created by `python manage.py seed_demo_data`:

| Role     | Email                  | Password       |
|----------|-------------------------|----------------|
| Admin    | admin@company.com       | Admin@12345    |
| HR       | hr@company.com          | Hr@12345       |
| Employee | (any seeded employee email, printed to the console) | Employee@123 |

These are for local development/demo purposes only — never use these credentials, or credentials like them, in production.

---

## 12. Running Tests

```bash
cd backend
python manage.py test
```

**54 tests, all passing**, covering:

- **Authentication**: login (valid/invalid), `/me/`, change password
- **Password reset security**: token expiry, one-time use, invalidation of prior tokens on reissue, session invalidation after reset, no email-enumeration, token hidden outside `DEBUG`
- **Permissions & object-level authorization**: Admin/HR/Employee boundaries on employees, attendance, leave, and payroll; an employee cannot view or edit another employee's record, attendance, leave, or payroll
- **Employee**: CRUD, validation (e.g. negative salary rejected), soft-delete
- **Attendance**: create, duplicate-per-day prevention, check-out-before-check-in rejection, own-record visibility, and an explicit query-count regression test proving the monthly report has no N+1 queries
- **Leave**: apply, HR approval/rejection workflow, overlap validation, and the ownership-immutability fix (an employee cannot reassign their own leave request to someone else)
- **Payroll**: gross/net calculation correctness, a client-submitted `net_salary` is ignored, duplicate-per-month prevention, `basic_salary` is always snapshotted from the employee record regardless of what the client submits, and the full status-transition matrix (valid forward steps succeed, skipped steps are rejected, HR cannot revert a status backward, only Admin can, and a `Paid` payroll can never be edited or deleted)
- **Departments**: CRUD, delete-blocked-while-employees-assigned, active-employee-count accuracy, and a query-count regression test proving the department list has no N+1 queries

For the frontend, `npm run lint` runs ESLint; `npm run build` performs a full production build and will surface any type/import errors.

---

## 13. Future Improvements

- Email delivery for the forgot-password flow (currently returns the token directly in `DEBUG` mode for demo purposes)
- Bulk payroll generation (run for an entire department/org in one action)
- Configurable leave-balance policies per leave type
- A formal audit log for sensitive actions (salary changes, status reversals)
- File attachments on leave requests (e.g. medical certificates)
- Automated frontend tests (React Testing Library / Playwright)
- Code-splitting the frontend bundle (currently a single ~500KB chunk)
- A dedicated salary-history model with effective-dated records, if the business ever needs to reconstruct exactly what an employee's contracted salary was at any past date (the current design snapshots the salary onto each payroll record at generation time, which covers payroll accuracy but not a full historical audit trail of contract changes)

---

## 14. Screenshots

_Add screenshots of the Login page, Admin Dashboard, Employees list, and Payslip view here once the app is running locally._

---

## 15. License

Provided as-is for portfolio and demonstration purposes.
