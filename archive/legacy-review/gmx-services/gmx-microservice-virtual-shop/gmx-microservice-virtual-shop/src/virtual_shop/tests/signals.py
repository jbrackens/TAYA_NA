from django.contrib.auth.models import User
from django.db.models import signals
from django.test import TestCase

from common.signal_handlers import *

logger = logging.getLogger(__name__)


class SignalsHandlersTest(TestCase):
    def setUp(self):
        # Save up the number of connected signals so that we can check at the
        # end that all the signals we register get properly unregistered (#9989)
        self.pre_signals = (
            len(signals.post_save.receivers),
            len(signals.post_delete.receivers),
        )

    def tearDown(self):
        # All our signals got disconnected properly.
        post_signals = (
            len(signals.post_save.receivers),
            len(signals.post_delete.receivers),
        )
        self.assertEqual(self.pre_signals, post_signals)

    def test_valid_serializer(self):
        data = []

        def post_init_callback(sender, instance, **kwargs):
            data.append(instance)

        signals.post_init.connect(post_init_callback)

        p1 = models.Order(status="NEW", status_message="New Order")
        self.assertEqual(data, [p1])

    def test_save_signals_with_succes(self):
        self.user = User.objects.create(username="SignalUser")
        data = []

        # noqa: F841
        def post_save_handler(signal, sender, instance, **kwargs):  # noqa: F841
            data.append((instance, sender, kwargs.get("created"), kwargs.get("raw", False)))

        signals.post_save.connect(post_save_handler, weak=False)
        try:
            p1 = models.Order.objects.create(status="NEW", status_message="New Order", user=self.user)
            self.assertEqual(
                data,
                [
                    (p1, models.Order, True, False),
                ],
            )
            data[:] = []

            p1.status = "SUCCESS"
            p1.status_message = "Changed status message"
            p1.save()
            self.assertEqual(
                data[2],
                (p1, models.Order, False, False),
            )
            data[:] = []
        finally:
            signals.post_save.disconnect(post_save_handler)

    def test_save_signals_with_status_message(self):
        self.user = User.objects.create(username="SignalUser")
        data = []

        def post_save_handler(signal, sender, instance, **kwargs):  # noqa: F841
            data.append((instance, sender, kwargs.get("created"), kwargs.get("raw", False)))

        signals.post_save.connect(post_save_handler, weak=False)
        try:
            p1 = models.Order.objects.create(status="NEW", status_message="New Order", user=self.user)

            self.assertEqual(
                data,
                [
                    (p1, models.Order, True, False),
                ],
            )
            data[:] = []

            p1.status = "SUCCESS"
            p1.status_message = "Changed status message"
            p1.save()
            logger.info(data)
            logger.info("*" * 50)
            logger.info(
                [
                    (p1, models.Order, False, False),
                ]
            )
            self.assertEqual(
                data[2],
                (p1, models.Order, False, False),
            )
            data[:] = []
        finally:
            signals.post_save.disconnect(post_save_handler)
