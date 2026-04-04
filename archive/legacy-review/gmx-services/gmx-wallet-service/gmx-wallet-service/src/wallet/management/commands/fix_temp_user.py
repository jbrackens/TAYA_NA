from django.contrib.auth import get_user_model
from django.core.management import CommandError
from django.core.management.base import BaseCommand
from django.db import transaction
import logging
from django.core.cache import cache

from wallet.models import Wallet

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Command is used to fix temp users - RDM-547 - one time use.'

    def add_arguments(self, parser):
        parser.add_argument('input_filename')
        parser.add_argument('output_filename')

    def handle(self, *args, **options):
        raise CommandError('Do not use this!')
        # User = get_user_model()
        # input_filename = options.get('input_filename')
        # output_filename = options.get('output_filename')
        #
        # company_mapper = dict()
        #
        # with open(input_filename, 'r') as fh, open(output_filename, 'a') as fo:
        #     current_row = 1
        #     with transaction.atomic():
        #         try:
        #             for line in fh:
        #                 current_row += 1
        #                 if current_row % 100 == 0:
        #                     logger.info('{} rows processed.'.format(current_row))
        #
        #                 user_id, target_company_id = line.strip().split(',')
        #                 if target_company_id not in company_mapper:
        #                     company_mapper[target_company_id] = User.objects.filter(username=target_company_id).values_list('id', flat=True).first()
        #                 target_company_user_id = company_mapper.get(target_company_id)
        #
        #                 count = Wallet.objects.filter(user__username=user_id).update(originator=target_company_user_id)
        #                 fo.write('{},{},{}\n'.format(user_id, target_company_id, count))
        #
        #             logger.info('Flushing Redis DB')
        #             cache.client.clear()
        #
        #         except Exception as e:
        #             logger.exception('Catch exception: {}'.format(e))
        #             raise


