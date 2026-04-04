from typing import Tuple

from django.db import transaction

from payment_gateway import models as payment_models

from . import models


def create_antstream_order(
    user: models.CustomUser, partner: models.Partner, product: models.Product
) -> Tuple[models.Order, models.OrderLine, models.OrderLineItem]:
    assert transaction.get_connection().in_atomic_block, "This must be called inside atomic block!"
    order: models.Order = models.Order.objects.create(
        user=user,
        partner=partner,
        currency=product.currency,
        payment_status=payment_models.ReceiptModel.PaymentStatus.PENDING,
        order_status=models.Order.OrderStatus.NEW,
        order_sum=product.price,
    )
    line = models.OrderLine.objects.create(
        provision_status=models.OrderLine.ProvisionStatus.PENDING,
        order=order,
        product=product,
        quantity=1,
        price=product.price,
    )
    item = models.OrderLineItem.objects.create(
        position=0, order_line=line, sub_provision_status=models.OrderLineItem.SubProvisionStatus.PENDING
    )
    return order, line, item
