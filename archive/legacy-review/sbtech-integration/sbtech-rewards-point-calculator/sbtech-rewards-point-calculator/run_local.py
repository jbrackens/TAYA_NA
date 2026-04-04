import arrow

from tools import generate_registrations_with_marketing_opt_in, generate_lambda_event_from_filename
from main import lambda_handler


yesterday = arrow.now().shift(days=-1).format('YYYYMMDD')

generate_registrations_with_marketing_opt_in(yesterday)

# lambda_handler(generate_lambda_event_from_filename('Punters-{}.csv'.format(yesterday)), {})
# lambda_handler(generate_lambda_event_from_filename('CasinoGrouped-{}.xlsx'.format(yesterday)), {})
# lambda_handler(generate_lambda_event_from_filename('DirectBonus-optinmarket-{}.csv'.format(yesterday)), {})
# lambda_handler(generate_lambda_event_from_filename('Bets-{}.xlsx'.format(yesterday)), {})
