from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Allows access only to Admin users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "ADMIN")


class IsHR(BasePermission):
    """Allows access only to HR users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "HR")


class IsAdminOrHR(BasePermission):
    """Allows access to Admin and HR users - the typical 'management' permission."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("ADMIN", "HR")
        )


class IsAdminOrHRReadOnlyElseOwner(BasePermission):
    """
    Admin/HR may do anything. Employees may only read/update their own
    linked records (object must expose a `.user` or `.employee.user` attr).
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role in ("ADMIN", "HR"):
            return True
        owner = getattr(obj, "user", None) or getattr(getattr(obj, "employee", None), "user", None)
        if request.method in SAFE_METHODS:
            return owner == user
        return owner == user  # employees can update only their own allowed fields (validated in serializer)


class ReadOnlyOrAdminHR(BasePermission):
    """Anyone authenticated can read (list/retrieve); only Admin/HR can write."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in ("ADMIN", "HR")
