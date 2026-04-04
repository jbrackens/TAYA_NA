from parsers import create_parser
from writers import create_writer


def lambda_handler(event, context):
    parser = create_parser(event=event)(event=event)

    with create_writer() as writer:
        for item in parser.get_items():
            writer.add(item=item)

    return ''
