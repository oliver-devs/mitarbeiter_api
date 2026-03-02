from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.routers import DefaultRouter

from .views import ChangePasswordView, DepartmentViewSet, EmployeeViewSet, PositionViewSet

router = DefaultRouter()
router.register(r"employees", EmployeeViewSet)
router.register(r"departments", DepartmentViewSet)
router.register(r"positions", PositionViewSet)

urlpatterns = [
    path("login/", obtain_auth_token, name="login"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("", include(router.urls)),
]
