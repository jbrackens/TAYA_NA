from django.core.management.base import BaseCommand

from oidc import models
from oidc.token_tools import PERMISSIONS_LIST


class Command(BaseCommand):
    help = "Command is useful to create default list or Permissions. It creates missing permissions and corrects the descriptions."

    def handle(self, *args, **options):
        for permission, description in PERMISSIONS_LIST:
            permission = permission.strip().lower()
            description = description.strip()
            permission_model, created = models.OidcPermissions.objects.get_or_create(
                name=permission, defaults={"description": description}
            )
            if created:
                self.stdout.write(f"Created {permission_model}")
