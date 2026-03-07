from django.contrib import admin

from .models import Absence, Department, Employee, Position


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "email", "department", "position", "is_approved")
    list_filter = ("is_approved", "department", "position")
    search_fields = ("first_name", "last_name", "email")
    list_per_page = 25


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "description")
    search_fields = ("name",)


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ("title", "description", "group", "can_approve", "requires_dual_approval")
    list_filter = ("group", "can_approve", "requires_dual_approval")
    search_fields = ("title",)


@admin.register(Absence)
class AbsenceAdmin(admin.ModelAdmin):
    list_display = ("employee", "absence_type", "start_date", "end_date", "status", "approvals_required")
    list_filter = ("absence_type", "status", "start_date")
    search_fields = ("employee__first_name", "employee__last_name")
