import functools
import json
import logging

from rest_framework.exceptions import ValidationError

from common.common_tools import OrderLinesValues
from virtual_shop.models import UserBonusGroup

logger = logging.getLogger(__name__)


def create_json_text_for_notification(external_user_id, base_product, quantity, created_at):
    notification_text = (
        f"*{external_user_id}* just purchased following product from Virtual Store:\n"
        f"Product: *{base_product}*\n"
        f"Quantity: *{quantity}*\n"
        f"Date: {created_at}"
    )
    return json.dumps(notification_text)


def get_company_id_from_order_line(order_line):
    order_lines_values = OrderLinesValues()
    product_company_id = order_line.get(
        order_lines_values.base_product__product__product_type__partner_configuration__name
    )
    if product_company_id:
        company_id = product_company_id
    else:
        company_id = order_line.get(
            order_lines_values.base_product__package__package_product__product_type__partner_configuration__name
        )
    return company_id


def update_bonus_multiple(instance, bonus_multiple, quantity):
    update_user_bonus_group = UserBonusGroup.objects.get(
        user__username=instance.user,
        user_bonus_group__uid=str(bonus_multiple),
    )
    sbtech_bonus_ids = update_user_bonus_group.sbtech_bonus_ids
    sbtech_bonus_ids_send = update_user_bonus_group.sbtech_bonus_ids_send
    bonus_multiple_send = list(set(sbtech_bonus_ids) - set(sbtech_bonus_ids_send))[:quantity]

    update_user_bonus_group.sbtech_bonus_ids_send = sbtech_bonus_ids_send + bonus_multiple_send
    update_user_bonus_group.save(update_fields=["sbtech_bonus_ids_send"])
    return bonus_multiple_send


def updated_order_status_and_status_message(order_lines_str_array, order_lines_resolved, order_for_update):
    status_message = "AUTO CREDITING OK"
    if any(item["resolved_lines_str_array"] for item in order_lines_str_array):
        resolved_lines_str_array = []
        for item in order_lines_str_array:
            if item["resolved_lines_str_array"]:
                resolved_lines_str_array.append(item["resolved_lines_str_array"])

        resolved_lines_str_array = set([item for sublist in resolved_lines_str_array for item in sublist])
        status_message = "MANUAL CORRECTION - {}".format(resolved_lines_str_array)
        repls = ("'", ""), ("{", ""), ("}", "")
        status_message = functools.reduce(lambda a, kv: a.replace(*kv), repls, status_message)

    if all(item["resolved"] for item in order_lines_resolved):
        order_for_update.status = "RESOLVED"
        order_for_update.status_message = status_message
        try:
            order_for_update.save(update_fields=("status", "status_message"))
        except ValidationError as e:
            msg = "Unable to update Order table: {}. Contact administrator.".format(e)
            logger.exception(msg)
            raise ValidationError({"error": msg})
        except Exception as e:
            msg = "Critical unknown error: {}. Contact administrator.".format(e)
            logger.exception(msg)
            raise ValidationError({"error": msg})
