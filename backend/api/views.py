import secrets
import string
from http import HTTPStatus

from django.contrib.auth.models import User
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Department, Employee, Position
from .serializers import DepartmentSerializer, EmployeeSerializer, PositionSerializer

__all__ = [
    "DepartmentViewSet",
    "PositionViewSet",
    "EmployeeViewSet",
    "CurrentUserView",
    "ChangePasswordView",
]

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
        response_data = {
            **serializer.data,
            "initial_username": username,
            "initial_password": password,
        }

        return Response(response_data, status=HTTPStatus.CREATED, headers=headers)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(
            {"username": request.user.username, "email": request.user.email}
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
