from typing import override

from rest_framework.permissions import BasePermission, SAFE_METHODS

from .services import user_can_approve, user_is_management


class IsManagementOrReadOnly(BasePermission):
    """Nur Management/Staff dürfen schreiben, alle anderen nur lesen."""

    @override
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return user_is_management(request.user)


class IsOwnerOrStaff(BasePermission):
    """
    - Management/Staff dürfen alles.
    - Normale User dürfen alle Objekte lesen (GET),
      aber nur eigene Objekte erstellen/bearbeiten/löschen.
    - Genehmiger dürfen Abwesenheiten genehmigen, ablehnen und löschen.
    """

    @override
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    @override
    def has_object_permission(self, request, view, obj):
        if user_is_management(request.user):
            return True

        if request.method in SAFE_METHODS:
            return True

        if view.action in ("approve", "deny", "destroy"):
            return user_can_approve(request.user)

        return obj.employee.user_id == request.user.id
