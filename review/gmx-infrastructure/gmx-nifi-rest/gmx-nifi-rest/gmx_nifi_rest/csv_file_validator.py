import csv
import logging
from collections import namedtuple
from io import StringIO

from fastavro._validation import ValidationError

from gmx_nifi_rest import settings
from gmx_nifi_rest.services.http_service import JiraHttpService

logger = logging.getLogger(__name__)


async def validate_top_up_csv_file(filename, file_id, key):
    result = []
    count = 0
    response = await JiraHttpService.get_attachment(filename)
    top_up_lines = namedtuple("TopUpLines", "operator customer_id points")
    with StringIO(response) as csvfile:
        reader = csv.DictReader(csvfile)
        headers = reader.fieldnames
        if headers != ["operator", "customer_id", "points"]:
            msg = await jira_ticket_handling(0, key, file_id)
            logger.error(msg)
            raise ValidationError({"msg": msg})
        for row in reader:
            values = list(row.values())
            operator, customer_id, points = values[:3]
            if len(row) > 3:
                msg = await jira_ticket_handling(1, key, file_id)
                logger.error(msg)
                raise ValidationError({"msg": msg})
            if not all(values):
                msg = await jira_ticket_handling(2, key, file_id)
                logger.error(msg)
                raise ValidationError({"msg": msg})
            if not operator.isalpha() or not customer_id.isdigit() or not points.isdigit():
                msg = await jira_ticket_handling(3, key, file_id)
                logger.error(msg)
                raise ValidationError({"msg": msg})
            top_up_line = top_up_lines(operator, customer_id, points)
            result.append(top_up_line)
            count += 1
        return result, count


async def jira_ticket_handling(comment_index: int, key: str, file_id: str = None):
    comment = [
        "Header of this CSV file is not in format: ['operator', 'customer_id', 'points'].\n"
        "Please provide proper file",
        "To many values find in CSV file, make sure each line has only 3 values.",
        "Empty value find in CSV file. Please check your file.",
        "Incorrect value find in CSV file.\n"
        "Make sure `operator` has only letters, `customer_id` and `points` are digits only.",
        "There is no enough data in this ticket, all of those fields must by fulfilled:\n"
        "-ATTACHMENT\n"
        "-BRAND\n"
        "-BONUS CODE\n"
        "-END DATE AND TIME\n\n"
        "Please correct this ticket and change status for `IN PROGRESS` to perform again process.",
    ]

    await JiraHttpService.add_jira_comment(key=key, data=comment[comment_index])
    transition = settings.JIRA_TRANSITION_TO_DO
    await JiraHttpService.change_jira_transitions(key=key, data=transition)
    if file_id:
        await JiraHttpService.delete_jira_attachment(attachment_id=file_id)
    return comment[comment_index]
