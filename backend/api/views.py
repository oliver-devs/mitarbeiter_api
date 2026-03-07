import secrets
import string
from http import HTTPStatus

from django.contrib.auth.models import User
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Absence, Department, Employee, Position
from .permissions import IsOwnerOrStaff
from .serializers import (
    AbsenceSerializer,
    DepartmentSerializer,
    EmployeeSerializer,
    PositionSerializer,
)
from .services import get_employee_for_user, user_can_approve

_UMLAUT_MAP = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})
_PASSWORD_ALPHABET = string.ascii_letters + string.digits + "!@#$%"
_PASSWORD_LENGTH = 12


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]


class PositionViewSet(viewsets.ModelViewSet):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer
    permission_classes = [IsAuthenticated]


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        password = "".join(
            secrets.choice(_PASSWORD_ALPHABET) for _ in range(_PASSWORD_LENGTH)
        )

        employee = serializer.save()

        username = f"{employee.first_name}.{employee.last_name}".lower()
        username = username.translate(_UMLAUT_MAP)

        user, _created = User.objects.get_or_create(
            username=username, defaults={"email": employee.email}
        )
        user.set_password(password)
        user.save()

        headers = self.get_success_headers(serializer.data)
        return Response(
            {**serializer.data, "initial_username": username, "initial_password": password},
            status=HTTPStatus.CREATED,
            headers=headers,
        )


class AbsenceViewSet(viewsets.ModelViewSet):
    queryset = (
        Absence.objects
        .select_related("employee__position")
        .prefetch_related("approved_by")
    )
    serializer_class = AbsenceSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrStaff]

    def perform_create(self, serializer: AbsenceSerializer) -> None:
        employee = serializer.validated_data["employee"]
        creator = get_employee_for_user(self.request.user)
        can_approve = user_can_approve(self.request.user)
        is_own = creator and creator.id == employee.id

        # Nur Genehmiger/Staff dürfen für andere anlegen
        if not self.request.user.is_staff and not can_approve:
            if employee.email != self.request.user.email:
                raise PermissionDenied(
                    "Du kannst nur Abwesenheiten für dich selbst anlegen."
                )

        # Status darf nicht direkt gesetzt werden — nur über approve/deny
        serializer.validated_data.pop("status", None)

        approvals_required = 1
        if employee.position and employee.position.requires_dual_approval:
            approvals_required = 2

        if can_approve and not is_own:
            # Genehmiger legt für jemand anderen an → direkt genehmigt
            serializer.save(
                approvals_required=approvals_required,
                status=Absence.Status.APPROVED,
            )
        else:
            serializer.save(approvals_required=approvals_required)

    def perform_update(self, serializer: AbsenceSerializer) -> None:
        # Status darf nicht direkt über Update geändert werden
        serializer.validated_data.pop("status", None)
        serializer.save()

    def _validate_approval_action(self, request: Request) -> tuple[Absence, Employee]:
        """Gemeinsame Validierung für approve/deny Actions."""
        absence = self.get_object()
        employee = get_employee_for_user(request.user)

        if not user_can_approve(request.user):
            raise PermissionDenied("Du hast keine Genehmigungsberechtigung.")

        if employee and absence.employee_id == employee.id:
            raise PermissionDenied("Du kannst deine eigene Abwesenheit nicht bearbeiten.")

        if absence.status != Absence.Status.PENDING:
            raise ValidationError("Diese Abwesenheit ist bereits bearbeitet.")

        return absence, employee

    @action(detail=True, methods=["post"])
    def approve(self, request: Request, pk=None) -> Response:
        absence, approver = self._validate_approval_action(request)

        if absence.approved_by.filter(id=approver.id).exists():
            raise ValidationError("Du hast diese Abwesenheit bereits genehmigt.")

        absence.approved_by.add(approver)

        if absence.approved_by.count() >= absence.approvals_required:
            absence.status = Absence.Status.APPROVED
            absence.save(update_fields=["status"])

        return Response(self.get_serializer(absence).data)

    @action(detail=True, methods=["post"])
    def deny(self, request: Request, pk=None) -> Response:
        absence, _ = self._validate_approval_action(request)

        absence.status = Absence.Status.DENIED
        absence.save(update_fields=["status"])

        return Response(self.get_serializer(absence).data)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(
            {
                "username": request.user.username,
                "email": request.user.email,
                "is_staff": request.user.is_staff,
                "can_approve": user_can_approve(request.user),
            }
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not user.check_password(old_password):
            return Response(
                {"detail": "Altes Passwort ist falsch."},
                status=HTTPStatus.BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()

        return Response({"detail": "Passwort erfolgreich geändert."})
