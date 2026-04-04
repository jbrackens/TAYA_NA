from django.contrib.auth import get_user_model
from django.utils.timezone import now
from django.db import connection, transaction
from . import raw_queries
from wallet import models as wallet_models


def fetch_user_bpr_inc_points_in_circulation(for_date=None):
    """
    Example output:
    ```
    [
        {
            'for_date': datetime(2018, 1, 1),
            'count_username': 1,
            'sum_amount_bpr': 0.1,
            'sum_amount_inc': 0.1,
            'sum_difference': 0.1
        },
        {
            'for_date': datetime(2018, 1, 2),
            'count_username': 2,
            'sum_amount_bpr': 0.2,
            'sum_amount_inc': 0.2,
            'sum_difference': 0.2
        }
    ]
    ```
    :param for_date:
    :return:
    """
    if for_date is None:
        for_date = now()
    with connection.cursor() as cursor:
        cursor.execute(raw_queries.REPORT_USER_BPR_INC_POINTS_IN_CIRCULATION, {'param': for_date})
        result = []
        for row in cursor.fetchall():
            rid, for_date, count_username, sum_amount_bpr, sum_amount_inc, sum_difference = row
            if rid == '01_start':
                continue
            result.append({
                'for_date': for_date.date(),
                'count_username': count_username,
                'sum_amount_bpr': sum_amount_bpr,
                'sum_amount_inc': sum_amount_inc,
                'sum_difference': sum_difference
            })
    return result


def fetch_user_wallet_balance_status():
    """
    Example output:
    ```
    [
        {
            'username': rmx_d61a39502f7343b79b897ebdd267020a,
            'balance': 36540.00000000,
            'last_redeemed_amount': 235680.00000000,
            'last_redeemed_at': 2018-03-20 13:17:23.783858+00,
            'points_earned_lifetime': 2356801.00000000,
            'points_earned_current_month': 2356.00000000,
            'points_earned_yesterday': 40.00000000,
            'points_earned_last_30_days': 1240.00000000,
            'points_earned_last_7_days': 41330.00000000,
            'points_earned_current_week': 4110.00000000,
        },
        {
            'username': rmx_44f306225837429587af1676c006bcac,
            'balance': 164485.47500000,
            'last_redeemed_amount': 36540.00000000,
            'last_redeemed_at': 2018-02-20 22:29:40.429452+00,
            'points_earned_lifetime': 2356801.00000000,
            'points_earned_current_month': 2356.00000000,
            'points_earned_yesterday': 40.00000000,
            'points_earned_last_30_days': 1240.00000000,
            'points_earned_last_7_days': 41330.00000000,
            'points_earned_current_week': 4110.00000000,
        }
    ]
    ```
    """
    with transaction.atomic():
        with connection.cursor() as cursor:
            for model in (wallet_models.Wallet, wallet_models.WalletLine, get_user_model()):
                cursor.execute(
                    'LOCK TABLE {} IN ROW SHARE MODE'.format(model._meta.db_table)
                )
            cursor.execute(raw_queries.REPORT_USER_WALLET_BALANCE_STATUS)
            result = []
            for row in cursor.fetchall():
                username, current_balance, \
                    last_redeemed_amount, last_redeemed_at, \
                    points_earned_lifetime, points_earned_current_month, \
                    points_earned_yesterday, points_earned_last_30_days, \
                    points_earned_last_7_days, points_earned_current_week = row[:10]

                result.append({
                    'username': username,
                    'balance': current_balance,
                    'last_redeemed_amount': last_redeemed_amount,
                    'last_redeemed_at': last_redeemed_at,
                    'points_earned_lifetime': points_earned_lifetime,
                    'points_earned_current_month': points_earned_current_month,
                    'points_earned_yesterday': points_earned_yesterday,
                    'points_earned_last_30_days': points_earned_last_30_days,
                    'points_earned_last_7_days': points_earned_last_7_days,
                    'points_earned_current_week': points_earned_current_week
                })
    return result
