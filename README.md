# HRIS Concept – HR & Zeiterfassung (UI/UX Concept Study)

**HRIS Concept** (fiktiv entwickelt für die "Nexus Dynamics GmbH") ist eine webbasierte Unternehmens-Software zur Verwaltung von Mitarbeitern, Abwesenheiten und Arbeitszeiten. Der App-Name ist über die Einstellungen frei konfigurierbar (White-Labeling).

> **Kernfokus dieses Projekts:**
> Dieses Projekt dient in erster Linie als **UI/UX-Showcase und Konzeptstudie**. Der Schwerpunkt liegt nicht primär auf komplexer Backend-Logik, sondern auf der Frage: *"Wie muss eine moderne, intuitive und enterprise-taugliche Software für Endanwender gestaltet sein?"*

## Design-Philosophie & UX-Entscheidungen

Die gesamte Benutzeroberfläche wurde mit Fokus auf Ergonomie und einem klaren, modernen "Look & Feel" entwickelt.

*   **Soft UI & Flat Design:** Verzicht auf harte Schlagschatten. Stattdessen feine Rahmen, softe Hintergrund-Abstufungen und pastellige Status-Farben ("Pills").
*   **Grid-Layouts & Info-Karten:** Komplexe Ansichten (wie Einstellungen oder Kalender) nutzen ein geteiltes Raster. Neben Formularen oder Listen stehen "Info-Karten", die dem Nutzer direkt erklären, was passiert – ein bewährtes SaaS-Pattern zur Reduzierung von Support-Anfragen.
*   **Intuitive Navigation (Drill-Down):** Statt tiefer, verschachtelter Menüs wird in Listen hinein-navigiert (z.B. Abteilungen → Positionen).
*   **Kontext-Wechsel via Toggle:** Moderne Button-Toggles statt klassischer Tabs, um z.B. zwischen "Team-Kalender" und "Meine Anträge" fließend zu wechseln.
*   **White-Labeling Ready:** Unternehmensname und App-Name sind dynamisch in den Einstellungen anpassbar und ändern das komplette Branding der Software in Echtzeit (inkl. Login-Screen).
*   **Alphabetische Filterung:** Lange Listen werden mit einer Adressbuch-ähnlichen ABC-Filterleiste für schnelles Auffinden versehen.
*   **Per-User Theming:** Jeder Nutzer kann individuell zwischen Hell-/Dunkel-Modus und 10 Farbthemen wählen. Die Auswahl wird pro Benutzer gespeichert. Der Login-Bereich zeigt immer den Firmenstandard (Azure).
*   **Gender-basierte Farbstandards:** Beim ersten Login wird automatisch ein zum Geschlecht passendes Farbschema vorgeschlagen (Azure, Rosé oder Lavendel). Alle 10 Themes stehen aber frei zur Auswahl.
*   **Accessibility:** Semantisches HTML, Keyboard-Navigation und ARIA-Labels für barrierefreie Bedienung.

## Features

- **Interaktives Dashboard:** Rollenbasierte Startseite (Mitarbeiter vs. Management) mit anklickbaren KPI-Metriken und integriertem Zeiterfassungs-Widget.
- **Zeiterfassung:** Einstempeln/Ausstempeln mit Pausenverwaltung, Wochenübersicht und Korrekturaanträgen.
- **Mitarbeiter-Verzeichnis:** Alphabetisch gruppierte, durchsuchbare Listenansicht – für alle Benutzer sichtbar als Unternehmensverzeichnis.
- **Abwesenheiten (Urlaub, Krank, Homeoffice, Sonderurlaub):**
  - Monats-Kalender für das Team mit Tagesdetail-Dialog.
  - "Meine Anträge"-Ansicht für den Mitarbeiter.
  - "Freigaben"-Workflow für Vorgesetzte (Genehmigen / Ablehnen) mit Dual-Approval-Option.
- **Stammdaten-Verwaltung:** Abteilungen und dazugehörige Positionen mit Statistik-Dialog.
- **Profil & Einstellungen:**
  - Persönliche Profilkarte (read-only) mit Hinweis zur Änderung über die Personalabteilung.
  - Dynamisches Theming: Hell/Dunkel/System-Modus und 10 Farbthemen (5 maskulin, 5 feminin) mit gedämpften Custom-Paletten.
  - Passwort-Verwaltung.
- **Unternehmensverwaltung** (nur Management): Globale Einstellungen wie Firmenname, Software-Name, Urlaubstage und Wochenarbeitszeit.

---

## Tech-Stack

**Frontend**
- Angular 21 (Standalone Components, Signals, `computed()`, `effect()`, `@let`, `@if`/`@for`/`@switch`)
- Angular Material (M3 / Material 3 Design System) mit 10 Custom-Farbpaletten
- Vanilla CSS Grid & Flexbox
- TypeScript strict

**Backend**
- Django 6 + Django REST Framework
- Token-basierte Authentifizierung
- SQLite (Entwicklung)
- Python 3.12+ (`@override`, Walrus-Operator)

---

## Installation & Ausführung

### Voraussetzungen

- Node.js (>= 20)
- Python (>= 3.12)

### Backend starten

```bash
cd backend
cp .env.example .env          # Umgebungsvariablen anlegen
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
Das Backend läuft auf `http://127.0.0.1:8000/`.

### Frontend starten

```bash
cd frontend
npm install
npx ng serve
```
Das Frontend läuft auf `http://localhost:4200/`.

### Tests

```bash
# Backend
cd backend && python manage.py test api -v2

# Frontend
cd frontend && npx ng test
```

---

## API-Endpoints

| Endpoint | Beschreibung |
|---|---|
| `POST /api/login/` | Token-Authentifizierung |
| `GET /api/me/` | Aktueller Benutzer + Mitarbeiterdaten |
| `POST /api/change-password/` | Passwort ändern |
| `/api/departments/` | Abteilungen (CRUD) |
| `/api/positions/?department=id` | Positionen pro Abteilung (CRUD) |
| `/api/employees/` | Mitarbeiter (CRUD, paginiert) |
| `/api/absences/` | Abwesenheiten + `/approve/` + `/deny/` (paginiert) |
| `/api/time-entries/` | Zeiteinträge + `/punch_out/` + `/start_break/` + `/end_break/` (paginiert) |
| `/api/time-corrections/` | Korrekturanträge + `/approve/` + `/deny/` (paginiert) |

---

## Projektstruktur

```
backend/
  config/settings.py       # Django-Einstellungen
  api/models.py            # Department, Position, Employee, Absence, TimeEntry, TimeBreak, TimeCorrectionRequest
  api/views.py             # ViewSets + custom Actions
  api/serializers.py       # DRF Serializers
  api/permissions.py       # IsManagementOrReadOnly, IsOwnerOrStaff
  api/tests.py             # API-Tests

frontend/src/app/
  auth/                    # AuthService, Guards, Interceptor
  dashboard/               # KPI-Cards, Zeiterfassungs-Widget
  calendar/                # Abwesenheits-Kalender, Anträge, Genehmigungen
  time-tracking/           # Punch-in/out, Pausen, Wochenübersicht
  employee/                # Mitarbeiter-Verzeichnis + Formular
  settings/                # Profil, Theming, Stammdaten-Verwaltung
  shared/                  # Services, Models, Dialoge, Utilities
```
