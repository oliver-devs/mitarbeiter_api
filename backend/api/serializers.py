from rest_framework import serializers

from .models import Absence, Department, Employee, Position


class PositionSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="group.name", read_only=True)

    class Meta:
        model = Position
        fields = [
            "id", "title", "description", "group", "group_name",
            "can_approve", "requires_dual_approval",
        ]


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.IntegerField(source="employees.count", read_only=True)

    class Meta:
        model = Department
        fields = ["id", "name", "description", "employee_count"]


class EmployeeSerializer(serializers.ModelSerializer):
    department = serializers.SlugRelatedField(
        queryset=Department.objects.all(), slug_field="name"
    )
    position = serializers.SlugRelatedField(
        queryset=Position.objects.all(), slug_field="title", allow_null=True
    )

    class Meta:
        model = Employee
        fields = "__all__"


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

    def validate(self, data: dict) -> dict:
        if data.get("end_date") and data.get("start_date"):
            if data["end_date"] < data["start_date"]:
                raise serializers.ValidationError(
                    {"end_date": "Das Enddatum darf nicht vor dem Startdatum liegen."}
                )
        return data
