from django.core.management.base import BaseCommand

from profiles import models
from django.conf import settings


class Command(BaseCommand):
    help = 'Setup idenpontecally  startup users'

    def __init__(self, stdout=None, stderr=None, no_color=False):
        super().__init__(stdout=None, stderr=None, no_color=False)
        self.options = {}

    def _create_company(self):
        company = models.Company.objects.order_by('-created_at').first()
        if company is None:
            if 'verbosity' in self.options and self.options['verbosity'] > 1:
                self.stdout.write('Creating Default Company')
            company = models.Company.objects.create(
                name1='Rewards Matrix',
                name2='Flipsports Limited',
                website='https://flipsports.com',
                line_1='Gateshead International Business Center',
                line_2='Mulgrave Terence',
                city='Gatehead',
                post_code='NE83FD',
                region='Tyne upon Wear'
            )
        return company

    def _create_user(self, username, email, password, originator=None, company=None, is_staff=False, is_superuser=False):
        user = models.CustomUser.objects.filter(username=username).first()
        if user is None:
            if 'verbosity' in self.options and self.options['verbosity'] > 1:
                self.stdout.write('Creating {} user'.format(username))
            user = models.CustomUser(
                username=username,
                is_active=True,
                is_company=True if company else False,
                company=company,
                is_staff=is_staff,
                is_superuser=is_superuser,
                originator=originator,
            )
            user.set_password(password)
            user.full_clean()
            user.save()
            user.emails.create(email=email, is_verified=False, is_primary=True)
        return user

    def _update_emails_verified(self, user):
        if user.emails.filter(is_verified=False).exists():
            if 'verbosity' in self.options and self.options['verbosity'] > 1:
                self.stdout.write('Updating email to be verified for user {}'.format(user))
            user.emails.update(is_verified=True)

    def handle(self, *args, **options):
        self.options = options
        company = self._create_company()

        reward_matrix = self._create_user(
            username=settings.REWARD_MATRIX_USER,
            email=settings.REWARD_MATRIX_USER + '@example.com',
            company=company,
            password='123flipadmin#@!'
        )
        self._update_emails_verified(reward_matrix)

        flipadmin = self._create_user(
            username=settings.REWARD_MATRIX_FULL_ACCESS_USER,
            email=settings.REWARD_MATRIX_FULL_ACCESS_USER + '@example.com',
            password='123flipadmin#@!',
            originator=reward_matrix,
            is_staff=True,
            is_superuser=True
        )
        self._update_emails_verified(flipadmin)
