from django.core.management.base import BaseCommand
from django.db import transaction
import logging
from django.core.cache import cache

from oidc_temp_user.models import ExternalUserMappingModel
from profiles.models import CustomUser

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Command is used to fix temp users - RDM-547 - one time use.'

    def add_arguments(self, parser):
        parser.add_argument('input_filename')
        parser.add_argument('output_filename')

    def handle(self, *args, **options):
        pass
        # input_filename = options.get('input_filename')
        # output_filename = options.get('output_filename')
        #
        # company_mapper = dict()
        #
        # with open(input_filename, 'r') as fh, open(output_filename, 'a') as fo:
        #     fh.readline()  # ignore CSV header
        #     current_row = 1
        #     with transaction.atomic():
        #         try:
        #             for line in fh:
        #                 current_row += 1
        #                 if current_row % 100 == 0:
        #                     logger.info('{} rows processed.'.format(current_row))
        #                 ext_customer_id, target_company_id = line.strip().split(',')
        #                 if target_company_id not in company_mapper:
        #                     company_mapper[target_company_id] = CustomUser.objects.filter(company_id=target_company_id, is_company=True).values_list('id', flat=True).first()
        #                 target_company_user_id = company_mapper.get(target_company_id)
        #                 user_sub = ExternalUserMappingModel.objects.filter(external_user_id=ext_customer_id).exclude(company_id=target_company_id).values_list('user__sub', flat=True).first()
        #                 if user_sub is None:
        #                     continue
        #                 logger.info('Processing {} should have {}'.format(ext_customer_id, target_company_id))
        #                 fo.write('{},{}\n'.format(user_sub, target_company_id))
        #                 r = CustomUser.objects.filter(sub=user_sub).update(originator_id=target_company_user_id)
        #                 logger.info('\tCustomUser: {}'.format(r))
        #
        #                 r = ExternalUserMappingModel.objects.filter(user__sub=user_sub, company_id=target_company_id).delete()
        #                 logger.info(('ExternalUserMappingModel: {} deleted'.format(r)))
        #
        #                 r = ExternalUserMappingModel.objects.filter(user__sub=user_sub).update(company_id=target_company_id)
        #                 logger.info('\tExternalUserMappingModel: {}'.format(r))
        #             logger.info('Flushing Redis DB')
        #             cache.client.clear()
        #
        #         except Exception as e:
        #             logger.exception('Catch exception: {}'.format(e))
        #             raise


