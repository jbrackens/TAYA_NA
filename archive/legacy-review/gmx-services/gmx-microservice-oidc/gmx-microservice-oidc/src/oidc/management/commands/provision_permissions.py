from django.core.management.base import BaseCommand

from oidc import models
from oidc.tests import factory
from oidc.utils import PERMISSIONS_LIST


class Command(BaseCommand):
    help = 'Command is useful to create default list or Permissions. It creates missing permissions and corrects the descriptions.'

    def handle(self, *args, **options):
        for permission, description in PERMISSIONS_LIST:
            perm_groups = permission.strip().lower().split(':')
            description = description.strip()
            perm_groups.pop(-1)
            parent_group = None
            for perm_group in perm_groups:
                temp = models.GroupNode.objects.filter(name__iexact=perm_group, parent=parent_group).first()
                if temp is None:
                    temp = factory.GroupNodeFactory(name=perm_group, parent=parent_group)
                    if options['verbosity']:
                        self.stdout.write('Created - {}'.format(temp))
                parent_group = temp

            temp_node = models.PermissionNode.objects.filter(name__iexact=permission, parent=temp).first()
            if temp_node is None:
                temp_node = factory.PermissionNodeFactory(name=permission, parent=temp, description=description)
                if options['verbosity']:
                    self.stdout.write('Created - {}'.format(temp_node))
            else:
                temp_node.description = description
                temp_node.save(update_fields=('description',))
