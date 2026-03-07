from __future__ import annotations

from typing import TYPE_CHECKING

from .models import Employee

if TYPE_CHECKING:
    from django.contrib.auth.models import User


def get_employee_for_user(user: User) -> Employee | None:
    try:
        return Employee.objects.select_related("position").get(email=user.email)
    except Employee.DoesNotExist:
        return None


def user_can_approve(user: User) -> bool:
    emp = get_employee_for_user(user)
    return bool(emp and emp.position and emp.position.can_approve)
