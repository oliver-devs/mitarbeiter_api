from rest_framework.permissions import BasePermission, SAFE_METHODS

from .services import user_can_approve


class IsOwnerOrStaff(BasePermission):
    """
    - Staff-User dürfen alles.
    - Normale User dürfen alle Objekte lesen (GET),
      aber nur eigene Objekte erstellen/bearbeiten/löschen.
    - Genehmiger dürfen Abwesenheiten genehmigen, ablehnen und löschen.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True

        if request.method in SAFE_METHODS:
            return True

        if view.action in ("approve", "deny", "destroy"):
            return user_can_approve(request.user)

        return obj.employee.email == request.user.email
