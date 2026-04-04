from django.conf import settings
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "User provision automated script"

    def handle(self, *args, **options):  # noqa: F841
        if not User.objects.filter(username=settings.REWARD_MATRIX_FULL_ACCESS_USER).exists():
            User.objects.create_superuser(
                settings.REWARD_MATRIX_FULL_ACCESS_USER,
                settings.REWARD_MATRIX_FULL_ACCESS_USER + settings.REWARD_MATRIX_EMAIL_DOMAIN,
                settings.REWARD_MATRIX_FULL_ACCESS_PASS,
            )
