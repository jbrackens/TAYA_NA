UPDATE users
SET type = 'REAL';

UPDATE users
SET type = 'TEST'
WHERE external_id IN ('14056954', '14950306', '11295420'
                      --                       '16825817',
                      --                       '16684355',
                      --                       '15117866',
                      --                       '14529726',
                      --                       '13726203',
                      --                       '12319524',
                      --                       '11294549'
    )
