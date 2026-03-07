from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Absence, Department, Employee, Position


class BaseTestCase(TestCase):
    """Gemeinsames Setup: Positionen, Abteilung, Mitarbeiter, User + Auth-Token."""

    def setUp(self):
        self.dept = Department.objects.create(name="IT", description="IT-Abteilung")

        self.pos_normal = Position.objects.create(title="Entwickler")
        self.pos_approver = Position.objects.create(
            title="Personalreferent", can_approve=True
        )
        self.pos_dual = Position.objects.create(
            title="Geschäftsführer",
            can_approve=True,
            requires_dual_approval=True,
        )

        # Normaler Mitarbeiter
        self.emp_normal = Employee.objects.create(
            first_name="Max", last_name="Muster",
            email="max@test.de", department=self.dept, position=self.pos_normal,
        )
        self.user_normal = User.objects.create_user(
            username="max.muster", email="max@test.de", password="test1234"
        )

        # Genehmiger
        self.emp_approver = Employee.objects.create(
            first_name="Anna", last_name="Schmidt",
            email="anna@test.de", department=self.dept, position=self.pos_approver,
        )
        self.user_approver = User.objects.create_user(
            username="anna.schmidt", email="anna@test.de", password="test1234"
        )

        # Zweiter Genehmiger
        self.emp_approver2 = Employee.objects.create(
            first_name="Peter", last_name="Müller",
            email="peter@test.de", department=self.dept, position=self.pos_approver,
        )
        self.user_approver2 = User.objects.create_user(
            username="peter.mueller", email="peter@test.de", password="test1234"
        )

        # GF (dual approval)
        self.emp_gf = Employee.objects.create(
            first_name="Lisa", last_name="Weber",
            email="lisa@test.de", department=self.dept, position=self.pos_dual,
        )
        self.user_gf = User.objects.create_user(
            username="lisa.weber", email="lisa@test.de", password="test1234"
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

        # Erste Genehmigung — Status bleibt pending
        resp = self.client.post(f"/api/absences/{absence.id}/approve/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        absence.refresh_from_db()
        self.assertEqual(absence.status, Absence.Status.PENDING)

        # Zweite Genehmigung — jetzt approved
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
