from typing import override

from rest_framework import serializers
from .models import Absence, Department, Employee, Position, TimeEntry, TimeBreak, TimeCorrectionRequest


class PositionSerializer(serializers.ModelSerializer):
    employee_count = serializers.IntegerField(source="employees.count", read_only=True)

    class Meta:
        model = Position
        fields = [
            "id", "department", "title", "description",
            "is_management", "can_approve", "requires_dual_approval", "employee_count",
        ]


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.IntegerField(source="employees.count", read_only=True)
    position_count = serializers.IntegerField(source="positions.count", read_only=True)

    class Meta:
        model = Department
        fields = ["id", "name", "description", "employee_count", "position_count"]


class TimeBreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeBreak
        fields = ["id", "start_time", "end_time"]


class TimeCorrectionRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.__str__", read_only=True)

    class Meta:
        model = TimeCorrectionRequest
        fields = [
            "id", "employee", "employee_name", "time_entry", 
            "new_start_time", "new_end_time", "reason", "status", "created_at"
        ]
        read_only_fields = ["employee", "status", "created_at"]


class TimeEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    breaks = TimeBreakSerializer(many=True, read_only=True)

    class Meta:
        model = TimeEntry
        fields = [
            "id", "employee", "employee_name", 
            "date", "start_time", "end_time", "breaks",
            "is_manual_edit", "edit_reason"
        ]
        read_only_fields = ["id", "employee", "employee_name"]

    def get_employee_name(self, obj: TimeEntry) -> str:
        return str(obj.employee)

    @override
    def validate(self, data: dict) -> dict:
        if data.get("end_time") and data.get("start_time"):
            if data["end_time"] < data["start_time"]:
                raise serializers.ValidationError(
                    {"end_time": "Das Enddatum darf nicht vor dem Startdatum liegen."}
                )
        return data


class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    position_title = serializers.CharField(source="position.title", read_only=True, default=None)
    current_status = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id", "first_name", "last_name", "email", "gender",
            "department", "department_name",
            "position", "position_title",
            "birthday", "current_status", "created_at",
        ]

    def get_current_status(self, obj: Employee) -> str:
        from django.utils import timezone
        today = timezone.now().date()

        open_entry = obj.time_entries.filter(end_time__isnull=True).first()
        is_clocked_in = open_entry is not None
        is_on_break = bool(open_entry and open_entry.breaks.filter(end_time__isnull=True).exists())

        active_absence = obj.absences.filter(
            status=Absence.Status.APPROVED,
            start_date__lte=today,
            end_date__gte=today,
        ).first()

        absence_type = active_absence.absence_type if active_absence else None

        match (is_clocked_in, is_on_break, absence_type):
            case (True, True, _):
                return "break"
            case (True, False, Absence.AbsenceType.MEETING):
                return "busy"
            case (True, False, Absence.AbsenceType.HOMEOFFICE):
                return "homeoffice"
            case (True, _, _):
                return "online"
            case (False, _, Absence.AbsenceType.SICK):
                return "sick"
            case (False, _, Absence.AbsenceType.VACATION):
                return "vacation"
            case (False, _, str()):
                return "absent"
            case _:
                return "offline"


class AbsenceSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    approved_by_names = serializers.SerializerMethodField()
    approval_count = serializers.SerializerMethodField()

    class Meta:
        model = Absence
        fields = [
            "id", "employee", "employee_name", "absence_type",
            "start_date", "end_date", "note", "status",
            "approvals_required", "approved_by_names", "approval_count",
            "created_at",
        ]
        read_only_fields = ["approvals_required"]

    def get_employee_name(self, obj: Absence) -> str:
        return str(obj.employee)

    def get_approved_by_names(self, obj: Absence) -> list[str]:
        return [str(emp) for emp in obj.approved_by.all()]

    def get_approval_count(self, obj: Absence) -> int:
        return obj.approved_by.count()
