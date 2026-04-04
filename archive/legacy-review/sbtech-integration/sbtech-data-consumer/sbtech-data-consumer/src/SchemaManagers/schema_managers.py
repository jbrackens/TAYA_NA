import avro.schema


class SchemaManager:
    pass


class AvroSchemaManager(SchemaManager):
    def __init__(self):
        self.__schemas = {
            'login':
                avro.schema.Parse(open("resources/avro_schemas/login.avsc".format(), "rb").read()),

            'customerdetails':
                avro.schema.Parse(open("resources/avro_schemas/customerdetails.avsc".format(), "rb").read()),

            'casinobets':
                avro.schema.Parse(open("resources/avro_schemas/casinobets.avsc".format(), "rb").read()),

            'wallettransaction':
                avro.schema.Parse(open("resources/avro_schemas/wallettransaction.avsc".format(), "rb").read()),

            'sportbetsinfo':
                avro.schema.Parse(open("resources/avro_schemas/sportbetsinfo.avsc".format(), "rb").read())
        }

    def get_by_type(self, name: str):
        return self.__schemas.get(name.lower())
