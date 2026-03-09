import logging
import secrets
import string
from datetime import timedelta
from http import HTTPStatus
from typing import override

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Absence, Department, Employee, Position, TimeEntry, TimeBreak, TimeCorrectionRequest
from .permissions import IsManagementOrReadOnly, IsOwnerOrStaff
from .serializers import (
    AbsenceSerializer,
    DepartmentSerializer,
    EmployeeSerializer,
    PositionSerializer,
    TimeEntrySerializer,
    TimeCorrectionRequestSerializer,
)

from .services import get_employee_for_user, user_can_approve, user_is_management

logger = logging.getLogger(__name__)

_UMLAUT_MAP = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})
_PASSWORD_ALPHABET = string.ascii_letters + string.digits + string.punctuation
_PASSWORD_LENGTH = 16


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, IsManagementOrReadOnly]
    pagination_class = None


class PositionViewSet(viewsets.ModelViewSet):
    serializer_class = PositionSerializer
    permission_classes = [IsAuthenticated, IsManagementOrReadOnly]
    pagination_class = None

    @override
    def get_queryset(self):
        qs = Position.objects.all()
        department = self.request.query_params.get("department")
        if department:
            qs = qs.filter(department_id=department)
        return qs


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated, IsManagementOrReadOnly]

    @override
    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        password = "".join(
            secrets.choice(_PASSWORD_ALPHABET) for _ in range(_PASSWORD_LENGTH)
        )

        data = serializer.validated_data
        username = f"{data['first_name']}.{data['last_name']}".lower().translate(_UMLAUT_MAP)

        user, _created = User.objects.get_or_create(
            username=username, defaults={"email": data["email"]}
        )
        user.set_password(password)
        user.save()

        employee = serializer.save(user=user)

        logger.info("Employee created: %s (user=%s)", employee, username)

        headers = self.get_success_headers(serializer.data)
        # NOTE: In production, credentials should be sent via email,
        # not returned in the API response.
        return Response(
            {
                "employee": serializer.data,
                "credentials": {
                    "username": username,
                    "password": password,
                    "notice": "Initiales Passwort – nur einmalig sichtbar.",
                },
            },
            status=HTTPStatus.CREATED,
            headers=headers,
        )


class TimeCorrectionRequestViewSet(viewsets.ModelViewSet):
    serializer_class = TimeCorrectionRequestSerializer
    permission_classes = [IsAuthenticated]

    @override
    def get_queryset(self):
        user = self.request.user
        if user_can_approve(user):
            return TimeCorrectionRequest.objects.all()

        if emp := get_employee_for_user(user):
            return TimeCorrectionRequest.objects.filter(employee=emp)
        return TimeCorrectionRequest.objects.none()

    @override
    def perform_create(self, serializer):
        if not (emp := get_employee_for_user(self.request.user)):
            raise PermissionDenied("Kein Mitarbeiterprofil verknüpft.")
        serializer.save(employee=emp)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        if not user_can_approve(request.user):
            raise PermissionDenied("Keine Genehmigungsberechtigung.")
            
        correction = self.get_object()
        if correction.status != TimeCorrectionRequest.Status.PENDING:
            raise ValidationError("Antrag bereits bearbeitet.")

        # Zeit anwenden
        if correction.time_entry:
            entry = correction.time_entry
            entry.start_time = correction.new_start_time
            entry.end_time = correction.new_end_time
            entry.is_manual_edit = True
            entry.edit_reason = correction.reason
            entry.save()
        else:
            TimeEntry.objects.create(
                employee=correction.employee,
                start_time=correction.new_start_time,
                end_time=correction.new_end_time,
                is_manual_edit=True,
                edit_reason=correction.reason
            )

        correction.status = TimeCorrectionRequest.Status.APPROVED
        correction.save()
        return Response(self.get_serializer(correction).data)

    @action(detail=True, methods=["post"])
    def deny(self, request, pk=None):
        if not user_can_approve(request.user):
            raise PermissionDenied("Keine Genehmigungsberechtigung.")
            
        correction = self.get_object()
        correction.status = TimeCorrectionRequest.Status.DENIED
        correction.save()
        return Response(self.get_serializer(correction).data)


class TimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimeEntrySerializer
    permission_classes = [IsAuthenticated]

    def _get_open_entry(self, user) -> tuple[Employee, TimeEntry]:
        """Hilfsmethode: Liefert (Employee, offener TimeEntry) oder wirft ValidationError."""
        if not (emp := get_employee_for_user(user)):
            raise PermissionDenied("Kein Mitarbeiterprofil.")
        if not (entry := TimeEntry.objects.filter(employee=emp, end_time__isnull=True).first()):
            raise ValidationError("Nicht eingestempelt.")
        return emp, entry

    @override
    def get_queryset(self):
        qs = TimeEntry.objects.all()
        if not user_is_management(self.request.user):
            if emp := get_employee_for_user(self.request.user):
                qs = qs.filter(employee=emp)
            else:
                qs = qs.none()

        if employee_id := self.request.query_params.get("employee"):
            qs = qs.filter(employee_id=employee_id)

        return qs

    @override
    def create(self, request: Request, *args, **kwargs) -> Response:
        if not (employee := get_employee_for_user(request.user)):
            return Response({"detail": "Kein Mitarbeiterprofil."}, status=HTTPStatus.FORBIDDEN)

        # Gesetzliche Prüfung: 11 Stunden Ruhezeit
        if last_entry := TimeEntry.objects.filter(employee=employee, end_time__isnull=False).order_by("-end_time").first():
            rest_period = timezone.now() - last_entry.end_time
            if rest_period < timedelta(hours=11):
                earliest = (last_entry.end_time + timedelta(hours=11)).strftime('%H:%M')
                return Response({
                    "detail": f"Gesetzliche Ruhezeit verletzt. Du hättest erst ab {earliest} Uhr wieder arbeiten dürfen."
                }, status=HTTPStatus.BAD_REQUEST)

        if TimeEntry.objects.filter(employee=employee, end_time__isnull=True).exists():
            return Response({"detail": "Bereits eingestempelt."}, status=HTTPStatus.BAD_REQUEST)

        entry = TimeEntry.objects.create(employee=employee)
        return Response(self.get_serializer(entry).data, status=HTTPStatus.CREATED)

    @action(detail=False, methods=["post"])
    def punch_out(self, request: Request) -> Response:
        employee, open_entry = self._get_open_entry(request.user)

        now = timezone.now()
        if (now - open_entry.start_time) > timedelta(hours=10):
            logger.warning("Mitarbeiter %s hat die maximale Arbeitszeit von 10 Stunden überschritten.", employee)

        open_entry.end_time = now
        open_entry.save()
        return Response(self.get_serializer(open_entry).data)

    @action(detail=False, methods=["post"])
    def start_break(self, request: Request) -> Response:
        _, open_entry = self._get_open_entry(request.user)
        TimeBreak.objects.create(time_entry=open_entry)
        open_entry.refresh_from_db()
        return Response(self.get_serializer(open_entry).data)

    @action(detail=False, methods=["post"])
    def end_break(self, request: Request) -> Response:
        _, open_entry = self._get_open_entry(request.user)
        if not (active_break := open_entry.breaks.filter(end_time__isnull=True).first()):
            raise ValidationError("Keine aktive Pause.")
        active_break.end_time = timezone.now()
        active_break.save()
        open_entry.refresh_from_db()
        return Response(self.get_serializer(open_entry).data)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        data: dict[str, object] = {
            "username": request.user.username,
            "email": request.user.email,
            "is_management": user_is_management(request.user),
            "can_approve": user_can_approve(request.user),
        }

        if emp := get_employee_for_user(request.user):
            data |= {
                "employee_id": emp.id,
                "first_name": emp.first_name,
                "last_name": emp.last_name,
                "gender": emp.gender,
                "birthday": emp.birthday.isoformat() if emp.birthday else None,
                "department_id": emp.department_id,
                "department_name": emp.department.name if emp.department else None,
                "position_title": emp.position.title if emp.position else None,
                "current_status": EmployeeSerializer().get_current_status(emp),
                "created_at": emp.created_at.isoformat() if emp.created_at else None,
            }

        return Response(data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not old_password or not new_password:
            raise ValidationError({"detail": "Altes und neues Passwort sind erforderlich."})

        if not user.check_password(old_password):
            raise ValidationError({"detail": "Altes Passwort ist falsch."})

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise ValidationError({"detail": exc.messages})

        user.set_password(new_password)
        user.save()

        return Response({"detail": "Passwort erfolgreich geändert."})


class AbsenceViewSet(viewsets.ModelViewSet):
    queryset = (
        Absence.objects
        .select_related("employee__position")
        .prefetch_related("approved_by")
    )
    serializer_class = AbsenceSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrStaff]

    @override
    def perform_create(self, serializer: AbsenceSerializer) -> None:
        employee = serializer.validated_data["employee"]
        creator = get_employee_for_user(self.request.user)
        can_approve = user_can_approve(self.request.user)
        is_own = creator and creator.id == employee.id

        if not user_is_management(self.request.user) and not can_approve:
            if employee.user_id != self.request.user.id:
                raise PermissionDenied("Du kannst nur Abwesenheiten für dich selbst anlegen.")

        serializer.validated_data.pop("status", None)
        approvals_required = 1
        if employee.position and employee.position.requires_dual_approval:
            approvals_required = 2

        if can_approve and not is_own:
            serializer.save(approvals_required=approvals_required, status=Absence.Status.APPROVED)
        else:
            serializer.save(approvals_required=approvals_required)

    @override
    def perform_update(self, serializer: AbsenceSerializer) -> None:
        serializer.validated_data.pop("status", None)
        serializer.save()

    def _validate_approval_action(self, request: Request) -> tuple[Absence, Employee]:
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
            raise ValidationError("Bereits genehmigt.")
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
