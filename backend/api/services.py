from __future__ import annotations

from typing import TYPE_CHECKING

from .models import Employee

if TYPE_CHECKING:
    from django.contrib.auth.models import User


def get_employee_for_user(user: User) -> Employee | None:
    try:
        return Employee.objects.select_related("position").get(user=user)
    except Employee.DoesNotExist:
        return None


def user_is_management(user: User) -> bool:
    if user.is_staff:
        return True
    if emp := get_employee_for_user(user):
        return bool(emp.position and emp.position.is_management)
    return False


def user_can_approve(user: User) -> bool:
    if user_is_management(user):
        return True
    if emp := get_employee_for_user(user):
        return bool(emp.position and emp.position.can_approve)
    return False
