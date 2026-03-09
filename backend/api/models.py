from django.conf import settings
from django.db import models
from django.utils import timezone


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["name"]
        verbose_name = "Abteilung"
        verbose_name_plural = "Abteilungen"

    def __str__(self) -> str:
        return self.name


class Position(models.Model):
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="positions",
    )
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    is_management = models.BooleanField(default=False)
    can_approve = models.BooleanField(default=False)
    requires_dual_approval = models.BooleanField(default=False)

    class Meta:
        ordering = ["title"]
        constraints = [
            models.UniqueConstraint(fields=["department", "title"], name="unique_position_per_department"),
        ]
        verbose_name = "Position"
        verbose_name_plural = "Positionen"

    def __str__(self) -> str:
        return f"{self.title} ({self.department})"


class Employee(models.Model):
    class Gender(models.TextChoices):
        MALE = "male", "Männlich"
        FEMALE = "female", "Weiblich"
        DIVERSE = "diverse", "Divers"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="employee",
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, default=Gender.MALE)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="employees"
    )
    position = models.ForeignKey(
        Position, on_delete=models.SET_NULL, null=True, blank=True, related_name="employees"
    )
    birthday = models.DateField(null=True, blank=True)
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
        MEETING = "meeting", "Besprechung"
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

class TimeEntry(models.Model):
    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="time_entries"
    )
    date = models.DateField(default=timezone.localdate)
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True, blank=True)
    is_manual_edit = models.BooleanField(default=False)
    edit_reason = models.TextField(blank=True, default="")
    
    class Meta:
        ordering = ["-start_time"]
        verbose_name = "Zeiteintrag"
        verbose_name_plural = "Zeiteinträge"

    def __str__(self) -> str:
        status = "Geöffnet" if not self.end_time else "Geschlossen"
        return f"{self.employee} ({self.date}) - {status}"

class TimeBreak(models.Model):
    time_entry = models.ForeignKey(
        TimeEntry, on_delete=models.CASCADE, related_name="breaks"
    )
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Pause"
        verbose_name_plural = "Pausen"

class TimeCorrectionRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Ausstehend"
        APPROVED = "approved", "Genehmigt"
        DENIED = "denied", "Abgelehnt"

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="time_corrections"
    )
    time_entry = models.ForeignKey(
        TimeEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name="corrections"
    )
    new_start_time = models.DateTimeField()
    new_end_time = models.DateTimeField()
    reason = models.TextField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Korrekturantrag"
        verbose_name_plural = "Korrekturanträge"
