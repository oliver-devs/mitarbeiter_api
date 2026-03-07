from django.contrib.auth.models import Group
from django.db import models


class Position(models.Model):
    title = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    group = models.ForeignKey(
        Group, on_delete=models.PROTECT, null=True, blank=True, related_name="positions"
    )
    can_approve = models.BooleanField(default=False)
    requires_dual_approval = models.BooleanField(default=False)

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


class Absence(models.Model):
    class AbsenceType(models.TextChoices):
        VACATION = "vacation", "Urlaub"
        SICK = "sick", "Krank"
        HOMEOFFICE = "homeoffice", "Homeoffice"
        OTHER = "other", "Sonstiges"

    class Status(models.TextChoices):
        PENDING = "pending", "Ausstehend"
        APPROVED = "approved", "Genehmigt"
        DENIED = "denied", "Abgelehnt"

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="absences"
    )
    absence_type = models.CharField(max_length=20, choices=AbsenceType.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    note = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    approved_by = models.ManyToManyField(
        Employee, blank=True, related_name="approved_absences"
    )
    approvals_required = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]
        verbose_name = "Abwesenheit"
        verbose_name_plural = "Abwesenheiten"

    def __str__(self) -> str:
        return f"{self.employee} – {self.get_absence_type_display()} ({self.start_date} bis {self.end_date})"
