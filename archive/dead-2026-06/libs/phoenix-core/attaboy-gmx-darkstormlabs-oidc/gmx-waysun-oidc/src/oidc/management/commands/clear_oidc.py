from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from oidc_provider.models import Code, Token


def clear_oidc():
    arn = "oidc::command::clear_oidc::lock"

    with cache.lock(arn, settings.CACHE_LOCK_MAX_TIMEOUT):
        when = timezone.now() - timedelta(days=31)

        with transaction.atomic():
            old_tokens_deleted, _ = Token.objects.filter(expires_at__lt=when).delete()
        with transaction.atomic():
            old_codes_deleted, _ = Code.objects.filter(expires_at__lt=when).delete()
        return old_tokens_deleted, old_codes_deleted


class Command(BaseCommand):
    help = "Remove expired entries for Token and Code"

    def handle(self, *args, **options):
        old_tokens_deleted, old_codes_deleted = clear_oidc()
        self.stdout.write(f"Removed {old_tokens_deleted} old tokens and {old_codes_deleted} old codes.")
