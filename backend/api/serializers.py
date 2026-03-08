from rest_framework import serializers

from .models import Absence, Department, Employee, Position, TimeEntry


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


class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    position_title = serializers.CharField(source="position.title", read_only=True, default=None)

    class Meta:
        model = Employee
        fields = [
            "id", "first_name", "last_name", "email",
            "department", "department_name",
            "position", "position_title",
            "created_at",
        ]


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

class TimeEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = TimeEntry
        fields = [
            "id", "employee", "employee_name", 
            "date", "start_time", "end_time",
        ]
        read_only_fields = ["id", "date", "start_time", "employee", "employee_name"]

    def get_employee_name(self, obj: TimeEntry) -> str:
        return str(obj.employee)

    def validate(self, data: dict) -> dict:
        if data.get("end_time") and data.get("start_time"):
            if data["end_time"] < data["start_time"]:
                raise serializers.ValidationError(
                    {"end_time": "Das Enddatum darf nicht vor dem Startdatum liegen."}
                )
        return data
