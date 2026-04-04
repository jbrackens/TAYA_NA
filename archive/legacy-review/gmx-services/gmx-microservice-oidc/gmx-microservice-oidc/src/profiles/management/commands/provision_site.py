import urllib.parse

from django.conf import settings
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Setup site'

    def handle(self, *args, **options):
        domain = urllib.parse.urlparse(settings.FRONTEND_SITE_URL).netloc
        if not Site.objects.filter(domain=domain).exists():
            name = settings.FRONTEND_SITE_URL.split('//')[-1].rstrip('/')
            Site.objects.create(
                name=name,
                domain=domain
            )

