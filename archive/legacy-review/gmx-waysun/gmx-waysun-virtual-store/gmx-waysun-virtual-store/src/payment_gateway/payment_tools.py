from django.db import transaction
from django.utils import timezone

from virtual_store import models as store_models

from . import models


def create_antstream_payment_receipt(
    user: store_models.CustomUser,
    order: store_models.Order,
    product: store_models.Product,
    china_mobile_user_id: str,
    cm_app_id: str,
    success_url: str,
    error_url: str,
):
    assert transaction.get_connection().in_atomic_block, "This must be called inside atomic block!"
    payment_id = models.ReceiptModel.generate_payment_id(cm_app_id)
    curr_date = timezone.now()

    receipt = models.ReceiptModel.objects.create(
        user=user,
        order=order,
        payment_id=payment_id,
        payment_status=models.ReceiptModel.PaymentStatus.PENDING,
        redirect_on_callback=True,
        redirect_success_url=success_url,
        redirect_failure_url=error_url,
        receipt_metadata=dict(
            ext_user_id=china_mobile_user_id,
            valid_time=curr_date.strftime("%Y%m%d%H%M%S"),
            expire_time=(curr_date + product.get_time_delta_for_subscription()).strftime("%Y%m%d%H%M%S"),
        ),
    )
    return receipt
