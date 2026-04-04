from Cryptodome.PublicKey import RSA
from django.core.management.base import BaseCommand
from oidc_provider.models import RSAKey


class Command(BaseCommand):
    help = 'Setup rsa key'

    def handle(self, *args, **options):
        if not RSAKey.objects.all().exists():
            try:
                key = RSA.generate(1024)
                rsakey = RSAKey(key=key.exportKey('PEM').decode('utf8'))
                rsakey.save()
                self.stdout.write(u'RSA key successfully created with kid: {0}'.format(rsakey.kid))
            except Exception as e:
                self.stdout.write('Something goes wrong: {0}'.format(e))
