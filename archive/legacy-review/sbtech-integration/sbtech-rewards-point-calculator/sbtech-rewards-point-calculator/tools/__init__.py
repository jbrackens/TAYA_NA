import pyexcel
import arrow
from readers import data_reader


def generate_lambda_event_from_filename(filename):
    return {
        "Records": [
            {
                's3': {
                    "object": {"key": filename},
                    "bucket": {"name": "rmx-points-calculator"}
                }
            }
        ]
    }


def generate_registrations_with_marketing_opt_in(date):
    src_file_path = 'Punters-{}.csv'.format(date)
    date = arrow.get(src_file_path.split('-')[1].split('.')[0], 'YYYYMMDD')

    data = data_reader.get_data(bucket=None, key=src_file_path)
    rows = pyexcel.iget_records(file_type='csv', file_content=data, encoding='utf-8')

    result = []
    for punter in rows:
        reg_date = arrow.get(punter.get('DateRegistered')).replace(hour=0, minute=0, second=0, microsecond=0)

        if (reg_date - date).days == 0 and punter.get('Operator') == 'Sportnation' and punter.get('PromotionalEmails') == 1:
            result.append({
                'customer_id': punter.get('CustomerID'),
                'points': 1100,
                'operator': 'Sportnation'
            })

    pyexcel.save_as(
        records=result,
        dest_file_name="temp/DirectBonus-optinmarket-{}.csv".format(date.format('YYYYMMDD'))
    )
