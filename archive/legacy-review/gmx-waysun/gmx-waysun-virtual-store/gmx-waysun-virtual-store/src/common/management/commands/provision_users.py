from django.conf import settings
from django.core.management.base import BaseCommand

from virtual_store.models import CustomUser


class Command(BaseCommand):
    help = "User provision automated script"

    def handle(self, *args, **options):  # noqa: F841
        if not CustomUser.objects.filter(username=settings.REWARD_MATRIX_FULL_ACCESS_USER).exists():
            CustomUser.objects.create_superuser(
                settings.REWARD_MATRIX_FULL_ACCESS_USER,
                settings.REWARD_MATRIX_FULL_ACCESS_USER + "@example.com",
                settings.REWARD_MATRIX_FULL_ACCESS_PASS,
            )
