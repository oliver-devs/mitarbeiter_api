from rest_framework import serializers

from .models import Department, Employee, Position

__all__ = ["PositionSerializer", "DepartmentSerializer", "EmployeeSerializer"]


class PositionSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="group.name", read_only=True)

    class Meta:
        model = Position
        fields = ["id", "title", "description", "group", "group_name"]


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
