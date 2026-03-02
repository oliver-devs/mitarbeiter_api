from django.contrib import admin

from .models import Department, Employee, Position


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
    list_display = ("title", "description", "group")
    list_filter = ("group",)
    search_fields = ("title",)
