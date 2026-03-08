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
from django.utils import timezone

from .models import Absence, Department, Employee, Position, TimeEntry
from .permissions import IsManagementOrReadOnly, IsOwnerOrStaff
from .serializers import (
    AbsenceSerializer,
    DepartmentSerializer,
    EmployeeSerializer,
    PositionSerializer,
    TimeEntrySerializer,
)
from .services import get_employee_for_user, user_can_approve, user_is_management

_UMLAUT_MAP = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})
_PASSWORD_ALPHABET = string.ascii_letters + string.digits + "!@#$%"
_PASSWORD_LENGTH = 12


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, IsManagementOrReadOnly]


class PositionViewSet(viewsets.ModelViewSet):
    serializer_class = PositionSerializer
    permission_classes = [IsAuthenticated, IsManagementOrReadOnly]

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

    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        password = "".join(
            secrets.choice(_PASSWORD_ALPHABET) for _ in range(_PASSWORD_LENGTH)
        )

        username = f"{serializer.validated_data['first_name']}.{serializer.validated_data['last_name']}".lower()
        username = username.translate(_UMLAUT_MAP)

        user, _created = User.objects.get_or_create(
            username=username, defaults={"email": serializer.validated_data["email"]}
        )
        user.set_password(password)
        user.save()

        employee = serializer.save(user=user)

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
        if not user_is_management(self.request.user) and not can_approve:
            if employee.user_id != self.request.user.id:
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
        from .services import get_employee_for_user

        data = {
            "username": request.user.username,
            "email": request.user.email,
            "is_management": user_is_management(request.user),
            "can_approve": user_can_approve(request.user),
        }

        emp = get_employee_for_user(request.user)
        if emp:
            data["employee_id"] = emp.id
            data["first_name"] = emp.first_name
            data["last_name"] = emp.last_name
            data["department_id"] = emp.department_id
            data["department_name"] = emp.department.name if emp.department else None
            data["position_title"] = emp.position.title if emp.position else None

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

        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise ValidationError({"detail": exc.messages})

        user.set_password(new_password)
        user.save()

        return Response({"detail": "Passwort erfolgreich geändert."})

class TimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimeEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = TimeEntry.objects.all()
        
        # Normale User sehen nur ihre eigenen Zeiten
        if not user_is_management(self.request.user):
            employee = get_employee_for_user(self.request.user)
            if employee:
                qs = qs.filter(employee=employee)
            else:
                qs = qs.none()
                
        employee_id = self.request.query_params.get("employee")
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
            
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(date=date)
            
        return qs

    def create(self, request: Request, *args, **kwargs) -> Response:
        employee = get_employee_for_user(request.user)
        if not employee:
            return Response(
                {"detail": "Dein Benutzerkonto ist mit keinem Mitarbeiterprofil verknüpft."},
                status=HTTPStatus.FORBIDDEN
            )
            
        # Überprüfen ob es schon einen offenen Eintrag gibt
        open_entry = TimeEntry.objects.filter(employee=employee, end_time__isnull=True).first()
        if open_entry:
            return Response(
                {"detail": "Du bist bereits eingestempelt. Bitte stempel dich erst aus."},
                status=HTTPStatus.BAD_REQUEST
            )
            
        # Manuelles Erstellen des Eintrags
        entry = TimeEntry.objects.create(employee=employee)
        
        serializer = self.get_serializer(entry)
        return Response(serializer.data, status=HTTPStatus.CREATED)

    def perform_create(self, serializer):
        # Wird durch die neue create-Methode nicht mehr primär genutzt,
        # bleibt aber als Fallback/Best-Practice sauber.
        employee = get_employee_for_user(self.request.user)
        serializer.save(employee=employee)

    @action(detail=False, methods=["post"])
    def punch_out(self, request: Request) -> Response:
        employee = get_employee_for_user(request.user)
        if not employee:
            print(f"DEBUG: No employee found for user {request.user}")
            raise PermissionDenied("Dein Benutzerkonto ist mit keinem Mitarbeiterprofil verknüpft.")
            
        open_entry = TimeEntry.objects.filter(employee=employee, end_time__isnull=True).first()
        if not open_entry:
            print(f"DEBUG: No open entry found to punch out for employee {employee}")
            raise ValidationError("Es gibt keinen offenen Zeiteintrag zum Ausstempeln.")
            
        print(f"DEBUG: Punching out for entry {open_entry.id}")
        open_entry.end_time = timezone.now()
        open_entry.save()
        
        return Response(self.get_serializer(open_entry).data)
