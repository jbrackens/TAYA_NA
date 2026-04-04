import re

from django.test import TestCase

from profiles import utils


class GenerateUserSubTestCase(TestCase):
    def test_generate_user_sub_basics(self):
        sub = utils.generate_user_sub()
        self.assertEqual(len(sub), 36, 'User sub should have 36 chars')
        self.assertTrue(sub.startswith('rmx_'), 'User sub should starts with "rmx_"')
        self.assertFalse(re.match(r'[A-Z]', sub), 'User sub should has only small letters')
        self.assertTrue(re.match(r'^rmx_[a-f0-9]{32}$', sub), 'User sub format is wrong: "rmx_[a-f0-9]{32}" - ' + sub)

    def test_generate_user_sub_difference(self):
        self.assertNotEqual(
            utils.generate_user_sub(),
            utils.generate_user_sub(),
            'Generator should return two different subs'
        )

    def test_get_random_display_name_diff(self):
        self.assertNotEqual(
            utils.get_random_display_name(),
            utils.get_random_display_name(),
            'Generator should return two different Names'
        )
