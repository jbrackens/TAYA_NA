from django.core.management import CommandError
from django.core.management.base import BaseCommand
from django.db import transaction
import logging
import csv
from django.core.cache import cache
from django.db.models import Count, Q

from oidc_temp_user.models import ExternalUserMappingModel
from profiles.models import Company

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Command is used to fix temp users - removing duplicates'

    def add_arguments(self, parser):
        parser.add_argument('input_filename')

    def handle(self, *args, **options):
        pass
        #
        # mapping_ext = self.get_mapping_ext(options)
        #
        # current_row = 0
        # with transaction.atomic():
        #     transaction.on_commit(cache.client.clear)
        #     try:
        #         for ext_user_id in ExternalUserMappingModel.objects.values_list('external_user_id', flat=True).annotate(counter=Count('external_user_id')).filter(counter__gt=1):
        #             current_row += 1
        #             if current_row % 100 == 0:
        #                 logger.info('{} rows processed'.format(current_row))
        #             if ext_user_id not in mapping_ext:
        #                 logger.warning('User {} not found in CSV?'.format(ext_user_id))
        #                 continue
        #             items_removed, _ = ExternalUserMappingModel.objects.filter(Q(external_user_id=ext_user_id) & ~Q(company=mapping_ext[ext_user_id])).delete()
        #             if items_removed != 1:
        #                 raise CommandError('Possible too many or to few ({}) deletions for: {}'.format(items_removed, ext_user_id))
        #
        #     except Exception as e:
        #         logger.exception('Catch exception: {}'.format(e))
        #         raise CommandError(e)

    def get_mapping_ext(self, options):
        originator_mapping = self.get_originator_mapping()
        input_filename = options.get('input_filename')
        with open(input_filename, 'r', encoding='utf16') as fh:
            csv_reader = csv.reader(fh)
            next(csv_reader)  # skipping header
            mapping_ext = dict()
            for line in csv_reader:
                uid = line.pop(0)
                operator = line[20]
                mapping_ext[uid] = originator_mapping[operator]
        return mapping_ext

    def get_originator_mapping(self):
        originator_mapping = dict()
        originator_mapping['Redzonesports'] = Company.objects.get(name1__exact='RedZone')
        originator_mapping['Sportnation'] = Company.objects.get(name1__exact='Sport Nation')
        return originator_mapping


