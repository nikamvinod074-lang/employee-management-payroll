from django.utils import timezone
from rest_framework import serializers

from employees.serializers import EmployeeMiniSerializer

from .models import LeaveRequest


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_detail = EmployeeMiniSerializer(source="employee", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.get_full_name", read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            "id", "employee", "employee_detail", "leave_type", "start_date", "end_date", "number_of_days",
            "reason", "status", "applied_date", "reviewed_by", "reviewed_by_name", "review_date", "review_comments",
        ]
        read_only_fields = ["id", "number_of_days", "status", "applied_date", "reviewed_by", "review_date"]
        extra_kwargs = {"employee": {"required": False}}

    def validate(self, attrs):
        request = self.context.get("request")
        employee = attrs.get("employee", getattr(self.instance, "employee", None))

        if employee is None and request and request.user.role in ("ADMIN", "HR"):
            raise serializers.ValidationError({"employee": "This field is required."})
        if employee is None and request and request.user.role not in ("ADMIN", "HR"):
            # Employee role: resolve their own linked employee record for validation purposes.
            # (The view sets it definitively on save via perform_create.)
            employee = getattr(request.user, "employee_profile", None)

        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "End date cannot be before start date."})

        if employee and start_date and end_date:
            overlapping = LeaveRequest.objects.filter(
                employee=employee,
                status__in=[LeaveRequest.Status.PENDING, LeaveRequest.Status.APPROVED],
                start_date__lte=end_date,
                end_date__gte=start_date,
            )
            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)
            if overlapping.exists():
                raise serializers.ValidationError(
                    "You already have a pending or approved leave request that overlaps with these dates."
                )
        return attrs


class LeaveRequestSelfUpdateSerializer(LeaveRequestSerializer):
    """
    Used when an Employee updates their own pending leave request.

    Deliberately excludes the `employee` field entirely (rather than just
    marking it read_only) so it is never accepted from the request body and
    can never be reassigned to a different employee — closes the IDOR where
    an employee could PATCH `{"employee": <other_id>}` on their own request.
    """

    class Meta(LeaveRequestSerializer.Meta):
        fields = [f for f in LeaveRequestSerializer.Meta.fields if f != "employee"]


class LeaveReviewSerializer(serializers.Serializer):
    """Used by HR/Admin to approve or reject a pending leave request."""

    status = serializers.ChoiceField(choices=[LeaveRequest.Status.APPROVED, LeaveRequest.Status.REJECTED])
    review_comments = serializers.CharField(required=False, allow_blank=True)

    def update(self, instance, validated_data):
        instance.status = validated_data["status"]
        instance.review_comments = validated_data.get("review_comments", "")
        instance.reviewed_by = self.context["request"].user
        instance.review_date = timezone.now()
        instance.save()
        return instance
