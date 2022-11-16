export type DatabaseService = {
    getAsync(): void;
};

/*
{
    "byServiceType": {
        "D:\src\database\databaseService:DatabaseService": [
            {
                "key": "DATABASE_SERVICE",
                "instanceLocation": "D:\src\database\dynamodb:DynamoDBClient",
                "scope": "Lifetime"
            },
            {
                "key": "DATABASE_SERVICE",
                "instanceLocation": "D:\src\database\sql:SqlClient",
                "scope": "Lifetime"
            }
        ]
    },
    "byKey": {
        "DATABASE_SERVICE": [
            {
                "serviceLocation":  "D:\src\database\databaseService:DatabaseService",
                "instanceLocation": "D:\src\database\dynamodb:DynamoDBClient"
            }
        ]
    }
}
* */