from Cryptodome.PublicKey import RSA
from django.core.management.base import BaseCommand
from oidc_provider.models import RSAKey


class Command(BaseCommand):
    help = "Setup rsa key"

    def handle(self, *args, **options):  # noqa: F841
        if not RSAKey.objects.all().exists():
            try:
                key = RSA.generate(3072)
                rsa_key = RSAKey(key=key.exportKey("PEM").decode("utf8"))
                rsa_key.save()
                self.stdout.write(u"RSA key successfully created with kid: {0}".format(rsa_key.kid))
            except Exception as e:
                self.stdout.write("Something goes wrong: {0}".format(e))
