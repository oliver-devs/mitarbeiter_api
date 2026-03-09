# CLAUDE.md – HRIS Concept Project

## Projekt-Überblick

UI/UX Concept Study für ein HRIS (HR Information System) namens "ClockIn".
Fiktiv entwickelt für die "Nexus Dynamics GmbH".

## Tech-Stack

- **Frontend:** Angular 21, Angular Material (M3), Standalone Components, Signals, TypeScript strict
- **Backend:** Django 6, Django REST Framework, Token-Auth, SQLite (dev)
- **Sprache:** UI und Kommentare auf Deutsch, Code-Bezeichner auf Englisch

## Projektstruktur

```
backend/
  config/settings.py       # Django-Einstellungen (env-basiert via django-environ)
  api/models.py            # Department, Position, Employee, Absence, TimeEntry, TimeBreak, TimeCorrectionRequest
  api/views.py             # ViewSets + custom Actions (punch_in/out, approve/deny)
  api/serializers.py       # DRF Serializers
  api/permissions.py       # IsManagementOrReadOnly, IsOwnerOrStaff
  api/services.py          # get_employee_for_user, user_is_management, user_can_approve
  api/tests.py             # Umfassende API-Tests

frontend/src/app/
  auth/                    # AuthService, Guards (authGuard, staffGuard), Interceptor
  dashboard/               # Hauptseite mit KPI-Cards, Zeiterfassung-Widget
  calendar/                # Abwesenheits-Kalender, Anträge, Genehmigungen
  time-tracking/           # Punch-in/out, Pausen, Wochenübersicht
  employee/                # Mitarbeiter-Liste (alphabetisch gruppiert) + Formular
  settings/                # Profil, Theming, Abteilungen/Positionen-Verwaltung
  shared/                  # Services, Models, Dialoge, Utilities
```

## Befehle

### Backend
```bash
cd backend
.venv/Scripts/activate          # Windows
source .venv/bin/activate       # Linux/Mac
python manage.py runserver      # Dev-Server auf :8000
python manage.py test api -v2   # Tests ausführen
python manage.py makemigrations # Schema-Änderungen
python manage.py migrate        # Migrationen anwenden
```

### Frontend
```bash
cd frontend
npm install
npx ng serve                    # Dev-Server auf :4200
npx ng build                    # Production-Build
npx ng test                     # Unit-Tests (Vitest)
```

## Architektur-Konventionen

### Frontend
- **100% Standalone Components** – keine NgModules
- **Signals + computed()** für State – kein RxJS BehaviorSubject
- **takeUntilDestroyed()** für alle Subscriptions in Komponenten
- **@if/@for/@switch** Control Flow – kein *ngIf/*ngFor
- **inject()** für DI – keine Constructor-Injection
- **Template-Driven Forms** mit ngModel
- Alle Interfaces in `shared/models.ts`, alle Services in `shared/`
- Paginated API: `PaginatedResponse<T>`, Services bieten `getX(page)` und `getAllX()`

### Backend
- Environment-Variablen via `django-environ` (.env-Datei in backend/)
- Pagination global aktiv (PAGE_SIZE=25), Departments/Positions ausgenommen
- Approval-Workflow: can_approve + is_own → pending, can_approve + !is_own → auto-approved
- Dual Approval: Position.requires_dual_approval → approvals_required=2
- Zeiterfassung: 11h-Ruhezeitprüfung, max 10h Arbeitszeit-Warnung (Logging)

## API-Endpoints

- `POST /api/login/` – Token-Auth
- `GET /api/me/` – Aktueller User + Employee-Daten
- `POST /api/change-password/`
- `/api/departments/` – CRUD (keine Pagination)
- `/api/positions/?department=id` – CRUD (keine Pagination)
- `/api/employees/` – CRUD (paginiert)
- `/api/absences/` – CRUD + `/approve/` + `/deny/` (paginiert)
- `/api/time-entries/` – Punch-in via POST, `/punch_out/`, `/start_break/`, `/end_break/` (paginiert)
- `/api/time-corrections/` – CRUD + `/approve/` + `/deny/` (paginiert)

## Wichtige Hinweise

- `.env` im backend/ enthält SECRET_KEY – nie committen (ist in .gitignore)
- `.env.example` dient als Vorlage
- Dashboard-CSS überschreitet aktuell das angular.json Budget (9.5kB > 8kB max)
- UI-Texte sind Deutsch, Fehlermeldungen teilweise gemischt DE/EN
