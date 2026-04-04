from django.contrib.auth import get_user_model

from wallet import models
from django.core.management import CommandError
from django.core.management.base import BaseCommand
from django.db import transaction
import logging
import csv
from django.core.cache import cache
from django.db.models import Q

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Command is used to fix temp users (originator change)- RDM-592 - can be used many times, just provide exported External UserMapping table.'
    """
        with tmp as (select external_user_id, count(1) from oidc_temp_user_externalusermappingmodel group by 1 having count(1)>1)
        select u.sub, c.id from oidc_temp_user_externalusermappingmodel l
        join profiles_customuser u
        on u.id = l.user_id
        join profiles_customuser cu
        on cu.id = u.originator_id
        join profiles_company c
        on c.id=cu.company_id
        where external_user_id not in (select external_user_id from tmp) 
    """
    company_mapper = None

    def add_arguments(self, parser):
        parser.add_argument('input_filename')

    def handle(self, *args, **options):
        user_model = get_user_model()
        input_filename = options.get('input_filename')

        self.company_mapper = dict()

        with open(input_filename, 'r') as fh:
            data_reader = csv.reader(fh)
            next(data_reader)
            current_row = 1
            with transaction.atomic():
                try:
                    for line in data_reader:
                        current_row += 1
                        if current_row % 100 == 0:
                            logger.info('{} rows processed.'.format(current_row))

                        user_sub, company_id = line
                        company_mapper_company_id = self.get_company_id(company_id, user_model)
                        count = self.validate_wallet_existence(company_mapper_company_id, user_sub)
                        if count < 1:
                            continue
                        self.make_update(company_mapper_company_id, user_sub)
                except Exception as e:
                    logger.exception(e)
                    raise CommandError(e)

                logger.info('Flushing Redis DB on commit success')
                transaction.on_commit(cache.client.clear)

    def make_update(self, company_mapper_company_id, user_sub):
        result = models.Wallet.objects.filter(Q(user__username=user_sub) & ~Q(originator_id=company_mapper_company_id)).update(originator_id=company_mapper_company_id)
        if result != 1:
            raise CommandError('Update failed for {} (result is {})'.format(user_sub, result))
        logger.info('Updated {} to {}'.format(user_sub, company_mapper_company_id))

    def validate_wallet_existence(self, company_mapper_company_id, user_sub):
        count = models.Wallet.objects.filter(Q(user__username=user_sub) & ~Q(originator_id=company_mapper_company_id)).count()
        if count > 1:
            raise CommandError('To many wallets for user: {} (found {})'.format(user_sub, company_mapper_company_id))
        return count

    def get_company_id(self, company_id, user_model):
        if company_id not in self.company_mapper:
            company_mapper_company_id = user_model.objects.filter(username=company_id).values_list('id', flat=True).first()
            if company_mapper_company_id is None:
                raise CommandError('Company {} not found !'.format(company_id))
            self.company_mapper[company_id] = company_mapper_company_id
        else:
            company_mapper_company_id = self.company_mapper[company_id]
        return company_mapper_company_id


