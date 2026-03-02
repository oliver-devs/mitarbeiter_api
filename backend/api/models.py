from django.contrib.auth.models import Group
from django.db import models

__all__ = ["Position", "Department", "Employee"]


class Position(models.Model):
    title = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    group = models.ForeignKey(
        Group, on_delete=models.PROTECT, null=True, blank=True, related_name="positions"
    )

    class Meta:
        ordering = ["title"]
        verbose_name = "Position"
        verbose_name_plural = "Positionen"

    def __str__(self) -> str:
        return self.title


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["name"]
        verbose_name = "Abteilung"
        verbose_name_plural = "Abteilungen"

    def __str__(self) -> str:
        return self.name


class Employee(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="employees"
    )
    position = models.ForeignKey(
        Position, on_delete=models.SET_NULL, null=True, blank=True, related_name="employees"
    )
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["last_name", "first_name"]
        verbose_name = "Mitarbeiter"
        verbose_name_plural = "Mitarbeiter"

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}"
