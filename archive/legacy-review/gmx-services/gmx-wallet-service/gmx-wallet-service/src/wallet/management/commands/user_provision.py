from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'User provision automated script'

    def handle(self, *args, **options):
        if not User.objects.filter(username='flipadmin').exists(): User.objects.create_superuser('flipadmin', 'wojtek+flipadmin@flipsports.com', '123flipadmin#@!')
        if not User.objects.filter(username='rmx_b2e3e77e95e8495d897803ef95caa5e5').exists(): User.objects.create(username='rmx_b2e3e77e95e8495d897803ef95caa5e5')
