from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Absence, Department, Employee, Position, TimeEntry, TimeBreak, TimeCorrectionRequest


class BaseTestCase(TestCase):
    """Gemeinsames Setup: Abteilung, Positionen, Mitarbeiter, User + Auth-Token."""

    def setUp(self):
        self.dept = Department.objects.create(name="IT", description="IT-Abteilung")

        self.pos_normal = Position.objects.create(
            title="Entwickler", department=self.dept,
        )
        self.pos_approver = Position.objects.create(
            title="Personalreferent", department=self.dept, can_approve=True,
        )
        self.pos_dual = Position.objects.create(
            title="Geschäftsführer", department=self.dept,
            can_approve=True, requires_dual_approval=True,
        )

        # Normaler Mitarbeiter
        self.user_normal = User.objects.create_user(
            username="max.muster", email="max@test.de", password="test1234",
        )
        self.emp_normal = Employee.objects.create(
            user=self.user_normal, first_name="Max", last_name="Muster",
            email="max@test.de", department=self.dept, position=self.pos_normal,
        )

        # Genehmiger
        self.user_approver = User.objects.create_user(
            username="anna.schmidt", email="anna@test.de", password="test1234",
        )
        self.emp_approver = Employee.objects.create(
            user=self.user_approver, first_name="Anna", last_name="Schmidt",
            email="anna@test.de", department=self.dept, position=self.pos_approver,
        )

        # Zweiter Genehmiger
        self.user_approver2 = User.objects.create_user(
            username="peter.mueller", email="peter@test.de", password="test1234",
        )
        self.emp_approver2 = Employee.objects.create(
            user=self.user_approver2, first_name="Peter", last_name="Müller",
            email="peter@test.de", department=self.dept, position=self.pos_approver,
        )

        # GF (dual approval)
        self.user_gf = User.objects.create_user(
            username="lisa.weber", email="lisa@test.de", password="test1234",
        )
        self.emp_gf = Employee.objects.create(
            user=self.user_gf, first_name="Lisa", last_name="Weber",
            email="lisa@test.de", department=self.dept, position=self.pos_dual,
        )

        self.client = APIClient()

    def auth_as(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    def create_absence(self, employee, **kwargs):
        defaults = {
            "absence_type": "vacation",
            "start_date": date.today() + timedelta(days=7),
            "end_date": date.today() + timedelta(days=14),
        }
        defaults.update(kwargs)
        return Absence.objects.create(employee=employee, **defaults)


# ──────────────────────────────────────────────────────────────
# Absence Approval Workflow
# ──────────────────────────────────────────────────────────────

class AbsenceApprovalTests(BaseTestCase):

    def test_approver_can_approve_others(self):
        absence = self.create_absence(self.emp_normal)
        self.auth_as(self.user_approver)

        resp = self.client.post(f"/api/absences/{absence.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        absence.refresh_from_db()
        self.assertEqual(absence.status, Absence.Status.APPROVED)

    def test_cannot_approve_own_absence(self):
        absence = self.create_absence(self.emp_approver)
        self.auth_as(self.user_approver)

        resp = self.client.post(f"/api/absences/{absence.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_dual_approval_requires_two(self):
        absence = self.create_absence(self.emp_gf, approvals_required=2)
        self.auth_as(self.user_approver)

        resp = self.client.post(f"/api/absences/{absence.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        absence.refresh_from_db()
        self.assertEqual(absence.status, Absence.Status.PENDING)

        self.auth_as(self.user_approver2)
        resp = self.client.post(f"/api/absences/{absence.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        absence.refresh_from_db()
        self.assertEqual(absence.status, Absence.Status.APPROVED)

    def test_deny_sets_status_immediately(self):
        absence = self.create_absence(self.emp_normal)
        self.auth_as(self.user_approver)

        resp = self.client.post(f"/api/absences/{absence.id}/deny/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        absence.refresh_from_db()
        self.assertEqual(absence.status, Absence.Status.DENIED)

    def test_non_approver_cannot_approve(self):
        absence = self.create_absence(self.emp_approver)
        self.auth_as(self.user_normal)

        resp = self.client.post(f"/api/absences/{absence.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_approver_creates_for_other_auto_approved(self):
        self.auth_as(self.user_approver)

        resp = self.client.post("/api/absences/", {
            "employee": self.emp_normal.id,
            "absence_type": "vacation",
            "start_date": str(date.today() + timedelta(days=7)),
            "end_date": str(date.today() + timedelta(days=14)),
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], "approved")

    def test_cannot_approve_already_approved(self):
        absence = self.create_absence(self.emp_normal, status=Absence.Status.APPROVED)
        self.auth_as(self.user_approver)

        resp = self.client.post(f"/api/absences/{absence.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_same_approver_cannot_approve_twice(self):
        absence = self.create_absence(self.emp_gf, approvals_required=2)
        self.auth_as(self.user_approver)

        self.client.post(f"/api/absences/{absence.id}/approve/")
        resp = self.client.post(f"/api/absences/{absence.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class AbsenceCRUDTests(BaseTestCase):

    def test_employee_can_create_own_absence(self):
        self.auth_as(self.user_normal)

        resp = self.client.post("/api/absences/", {
            "employee": self.emp_normal.id,
            "absence_type": "vacation",
            "start_date": str(date.today() + timedelta(days=7)),
            "end_date": str(date.today() + timedelta(days=14)),
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], "pending")

    def test_employee_cannot_create_for_other(self):
        self.auth_as(self.user_normal)

        resp = self.client.post("/api/absences/", {
            "employee": self.emp_approver.id,
            "absence_type": "vacation",
            "start_date": str(date.today() + timedelta(days=7)),
            "end_date": str(date.today() + timedelta(days=14)),
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_approver_can_create_for_other(self):
        self.auth_as(self.user_approver)

        resp = self.client.post("/api/absences/", {
            "employee": self.emp_normal.id,
            "absence_type": "sick",
            "start_date": str(date.today()),
            "end_date": str(date.today()),
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_status_cannot_be_set_directly(self):
        self.auth_as(self.user_normal)

        resp = self.client.post("/api/absences/", {
            "employee": self.emp_normal.id,
            "absence_type": "vacation",
            "start_date": str(date.today() + timedelta(days=7)),
            "end_date": str(date.today() + timedelta(days=14)),
            "status": "approved",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], "pending")

    def test_absences_list_is_paginated(self):
        self.auth_as(self.user_approver)
        resp = self.client.get("/api/absences/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("results", resp.data)
        self.assertIn("count", resp.data)


# ──────────────────────────────────────────────────────────────
# Time Tracking (Punch In/Out, Breaks)
# ──────────────────────────────────────────────────────────────

class TimeEntryPunchTests(BaseTestCase):

    def test_punch_in_creates_open_entry(self):
        self.auth_as(self.user_normal)

        resp = self.client.post("/api/time-entries/")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(resp.data["start_time"])
        self.assertIsNone(resp.data["end_time"])

    def test_cannot_punch_in_twice(self):
        self.auth_as(self.user_normal)

        self.client.post("/api/time-entries/")
        resp = self.client.post("/api/time-entries/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Bereits eingestempelt", resp.data["detail"])

    def test_punch_out_closes_entry(self):
        self.auth_as(self.user_normal)

        self.client.post("/api/time-entries/")
        resp = self.client.post("/api/time-entries/punch_out/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(resp.data["end_time"])

    def test_punch_out_without_open_entry_fails(self):
        self.auth_as(self.user_normal)

        resp = self.client.post("/api/time-entries/punch_out/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rest_period_enforced(self):
        self.auth_as(self.user_normal)

        entry = TimeEntry.objects.create(
            employee=self.emp_normal,
            start_time=timezone.now() - timedelta(hours=5),
            end_time=timezone.now() - timedelta(hours=1),
        )

        resp = self.client.post("/api/time-entries/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Ruhezeit", resp.data["detail"])

    def test_punch_in_allowed_after_rest_period(self):
        self.auth_as(self.user_normal)

        TimeEntry.objects.create(
            employee=self.emp_normal,
            start_time=timezone.now() - timedelta(hours=20),
            end_time=timezone.now() - timedelta(hours=12),
        )

        resp = self.client.post("/api/time-entries/")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_no_employee_profile_forbidden(self):
        user_no_emp = User.objects.create_user(
            username="ghost", password="test1234",
        )
        self.auth_as(user_no_emp)

        resp = self.client.post("/api/time-entries/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_time_entries_list_is_paginated(self):
        self.auth_as(self.user_normal)
        resp = self.client.get("/api/time-entries/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("results", resp.data)


class TimeBreakTests(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.auth_as(self.user_normal)
        self.client.post("/api/time-entries/")

    def test_start_break(self):
        resp = self.client.post("/api/time-entries/start_break/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["breaks"]), 1)
        self.assertIsNone(resp.data["breaks"][0]["end_time"])

    def test_end_break(self):
        self.client.post("/api/time-entries/start_break/")
        resp = self.client.post("/api/time-entries/end_break/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(resp.data["breaks"][0]["end_time"])

    def test_end_break_without_active_break_fails(self):
        resp = self.client.post("/api/time-entries/end_break/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_start_break_without_punch_in_fails(self):
        self.client.post("/api/time-entries/punch_out/")
        resp = self.client.post("/api/time-entries/start_break/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ──────────────────────────────────────────────────────────────
# Time Correction Requests
# ──────────────────────────────────────────────────────────────

class TimeCorrectionTests(BaseTestCase):

    def test_employee_can_create_correction(self):
        self.auth_as(self.user_normal)

        entry = TimeEntry.objects.create(
            employee=self.emp_normal,
            start_time=timezone.now() - timedelta(hours=9),
            end_time=timezone.now() - timedelta(hours=1),
        )

        new_start = timezone.now() - timedelta(hours=10)
        new_end = timezone.now() - timedelta(hours=2)

        resp = self.client.post("/api/time-corrections/", {
            "time_entry": entry.id,
            "new_start_time": new_start.isoformat(),
            "new_end_time": new_end.isoformat(),
            "reason": "Hatte mich 1h vertan",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], "pending")

    def test_approver_can_approve_correction(self):
        self.auth_as(self.user_normal)
        entry = TimeEntry.objects.create(
            employee=self.emp_normal,
            start_time=timezone.now() - timedelta(hours=9),
            end_time=timezone.now() - timedelta(hours=1),
        )
        new_start = timezone.now() - timedelta(hours=10)
        new_end = timezone.now() - timedelta(hours=2)

        correction = TimeCorrectionRequest.objects.create(
            employee=self.emp_normal,
            time_entry=entry,
            new_start_time=new_start,
            new_end_time=new_end,
            reason="Falsch gestempelt",
        )

        self.auth_as(self.user_approver)
        resp = self.client.post(f"/api/time-corrections/{correction.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "approved")

        entry.refresh_from_db()
        self.assertTrue(entry.is_manual_edit)
        self.assertEqual(entry.edit_reason, "Falsch gestempelt")

    def test_normal_user_cannot_approve_correction(self):
        correction = TimeCorrectionRequest.objects.create(
            employee=self.emp_approver,
            new_start_time=timezone.now() - timedelta(hours=10),
            new_end_time=timezone.now() - timedelta(hours=2),
            reason="Test",
        )

        self.auth_as(self.user_normal)
        resp = self.client.post(f"/api/time-corrections/{correction.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_approve_correction_without_entry_creates_new(self):
        correction = TimeCorrectionRequest.objects.create(
            employee=self.emp_normal,
            time_entry=None,
            new_start_time=timezone.now() - timedelta(hours=10),
            new_end_time=timezone.now() - timedelta(hours=2),
            reason="Vergessen einzustempeln",
        )

        self.auth_as(self.user_approver)
        resp = self.client.post(f"/api/time-corrections/{correction.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        new_entry = TimeEntry.objects.filter(
            employee=self.emp_normal, is_manual_edit=True,
        ).first()
        self.assertIsNotNone(new_entry)
        self.assertEqual(new_entry.edit_reason, "Vergessen einzustempeln")


# ──────────────────────────────────────────────────────────────
# Employee Creation
# ──────────────────────────────────────────────────────────────

class EmployeeCreateTests(BaseTestCase):

    def test_create_employee_returns_credentials(self):
        self.user_approver.is_staff = True
        self.user_approver.save()
        self.auth_as(self.user_approver)

        resp = self.client.post("/api/employees/", {
            "first_name": "Neue",
            "last_name": "Person",
            "email": "neue@test.de",
            "department": self.dept.id,
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("credentials", resp.data)
        self.assertIn("employee", resp.data)
        self.assertEqual(resp.data["credentials"]["username"], "neue.person")
        self.assertEqual(len(resp.data["credentials"]["password"]), 16)

    def test_umlaut_username_transliteration(self):
        self.user_approver.is_staff = True
        self.user_approver.save()
        self.auth_as(self.user_approver)

        resp = self.client.post("/api/employees/", {
            "first_name": "Jürgen",
            "last_name": "Müßig",
            "email": "juergen@test.de",
            "department": self.dept.id,
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["credentials"]["username"], "juergen.muessig")


# ──────────────────────────────────────────────────────────────
# Current User & Auth
# ──────────────────────────────────────────────────────────────

class CurrentUserViewTests(BaseTestCase):

    def test_can_approve_true_for_approver(self):
        self.auth_as(self.user_approver)

        resp = self.client.get("/api/me/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["can_approve"])

    def test_can_approve_false_for_normal_user(self):
        self.auth_as(self.user_normal)

        resp = self.client.get("/api/me/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data["can_approve"])

    def test_returns_employee_data(self):
        self.auth_as(self.user_normal)

        resp = self.client.get("/api/me/")
        self.assertEqual(resp.data["employee_id"], self.emp_normal.id)
        self.assertEqual(resp.data["first_name"], "Max")
        self.assertEqual(resp.data["department_name"], "IT")

    def test_unauthenticated_access_denied(self):
        self.client.credentials()
        resp = self.client.get("/api/me/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class ChangePasswordTests(BaseTestCase):

    def test_change_password_success(self):
        self.auth_as(self.user_normal)

        resp = self.client.post("/api/change-password/", {
            "old_password": "test1234",
            "new_password": "NewSecure!Pass99",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.user_normal.refresh_from_db()
        self.assertTrue(self.user_normal.check_password("NewSecure!Pass99"))

    def test_wrong_old_password_fails(self):
        self.auth_as(self.user_normal)

        resp = self.client.post("/api/change-password/", {
            "old_password": "wrong",
            "new_password": "NewSecure!Pass99",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_password_rejected(self):
        self.auth_as(self.user_normal)

        resp = self.client.post("/api/change-password/", {
            "old_password": "test1234",
            "new_password": "123",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
