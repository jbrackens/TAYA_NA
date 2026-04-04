from main import lambda_handler
lambda_handler(
    {
        "Records": [
            {
                's3': {
                    "object": {
                        # "key": "Punters-20190315.csv"
                        # "key": "CasinoGrouped-20190315T235959.xlsx"
                        # "key": "Bets-20190315i.xlsx"
                        "key": "DirectBonus-optinmarket-20190315.csv"
                        # "key": "DirectBonus-Welcome10x-20190310.xlsx"
                        # "key": "DirectBonus-HRRewards2x-20190309.xlsx"
                        # "key": "Olap-casino-20190208.xlsx"
                        # "key": "Olap-weekenddp-20190309.xlsx"
                        # "key": "DirectBonus-Slots2x-20190309.xlsx"
                        # "key": "BuyProduct-20180924c.xlsx"
                        # "key": "PuntersChameleon-20190315.xlsx"
                    },
                    "bucket": {
                        "name": "rmx-points-calculator"
                    }
                }
            }
        ]
    },
    {}
)

if __name__ == '__main__':
    pass
