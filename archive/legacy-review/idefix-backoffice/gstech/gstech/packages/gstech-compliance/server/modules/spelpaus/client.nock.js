/* @flow */
const nock = require('nock');  

nock('https://testapi.spelpaus.se:443', { encodedQueryParams: true })
  .post('/api/blocking-info/20', {
    requestId: 'nock_id',
    subjectId: '182701303378',
  }).times(2).reply(200,
    {
      isBlocked: true,
      requestId: '63600d50-342e-11e9-abaa-a550b4a1919a',
      responseId: 'd9a60f1cba874a45998e88ccd746b0ac',
    },
    [
      'Connection',
      'close',
      'Date',
      'Tue, 19 Feb 2019 10:09:04 GMT',
      'Content-Type',
      'application/json; charset=utf-8',
      'Transfer-Encoding',
      'chunked',
    ]);

nock('https://testapi.spelpaus.se:443', { encodedQueryParams: true })
  .post('/api/blocking-info/20', {
    requestId: 'nock_id',
    subjectId: '182701303377',
  }).times(2)
  .reply(200,
    {
      isBlocked: false,
      requestId: '6374cdd0-342e-11e9-abaa-a550b4a1919a',
      responseId: '517c772a0abb49fa9c720e2b1b3f006a',
    },
    [
      'Connection',
      'close',
      'Date',
      'Tue, 19 Feb 2019 10:09:04 GMT',
      'Content-Type',
      'application/json; charset=utf-8',
      'Transfer-Encoding',
      'chunked',
    ]);

nock('https://testapi.spelpaus.se:443', { encodedQueryParams: true })
  .post('/api/blocking-info/20', {
    requestId: 'nock_id',
    subjectId: '1827',
  }).times(2)
  .reply(400, '', [
    'Connection',
    'close',
    'Date',
    'Tue, 19 Feb 2019 10:09:04 GMT',
    'Content-Length',
    '0',
  ]);

nock('https://testapi.spelpaus.se:443', { encodedQueryParams: true })
  .post('/api/blocking-info/20', {
    requestId: 'nock_id',
    subjectId: '182701303377423',
  })
  .reply(400,
    {
      SubjectId: [
        'The field SubjectId must be a string or array type with a maximum length of \'12\'.',
      ],
    },
    [
      'Connection',
      'close',
      'Date',
      'Tue, 19 Feb 2019 10:09:04 GMT',
      'Content-Type',
      'application/json; charset=utf-8',
      'Transfer-Encoding',
      'chunked',
    ]);

nock('https://testapi.spelpaus.se:443', { encodedQueryParams: true })
  .post('/api/marketing-single-subjectid/20', {
    requestId: 'nock_id',
    subjectId: '182701303378',
  })
  .reply(200,
    {
      isBlocked: true,
      requestId: '638f5ab0-342e-11e9-abaa-a550b4a1919a',
      responseId: '7c9fa39473e542cd9963994c88fe2711',
    },
    [
      'Connection',
      'close',
      'Date',
      'Tue, 19 Feb 2019 10:09:04 GMT',
      'Content-Type',
      'application/json; charset=utf-8',
      'Transfer-Encoding',
      'chunked',
    ]);

nock('https://testapi.spelpaus.se:443', { encodedQueryParams: true })
  .post('/api/marketing-single-subjectid/20', {
    requestId: 'nock_id',
    subjectId: '182701303377',
  })
  .reply(200,
    {
      isBlocked: false,
      requestId: '63988270-342e-11e9-abaa-a550b4a1919a',
      responseId: '52fbb832dd674cb9a480952b62acda96',
    },
    [
      'Connection',
      'close',
      'Date',
      'Tue, 19 Feb 2019 10:09:05 GMT',
      'Content-Type',
      'application/json; charset=utf-8',
      'Transfer-Encoding',
      'chunked',
    ]);

nock('https://testapi.spelpaus.se:443', { encodedQueryParams: true })
  .post('/api/marketing-single-subjectid/20', {
    requestId: 'nock_id',
    subjectId: '1827',
  })
  .reply(400, '', [
    'Connection',
    'close',
    'Date',
    'Tue, 19 Feb 2019 10:09:05 GMT',
    'Content-Length',
    '0',
  ]);

nock('https://testapi.spelpaus.se:443', { encodedQueryParams: true })
  .post('/api/marketing-subjectid/20', {
    requestId: 'nock_id',
    items: [
      { itemId: '182701303378', subjectId: '182701303378' },
      { itemId: '182701303377', subjectId: '182701303377' },
    ],
  })
  .reply(200,
    {
      requestId: 'nock_id',
      allowedItemIds: ['182701303377'],
      responseId: 'a930a627fe404b9e97111942d4c269ce',
    },
    [
      'Connection',
      'close',
      'Date',
      'Tue, 19 Feb 2019 10:09:05 GMT',
      'Content-Type',
      'application/json; charset=utf-8',
      'Transfer-Encoding',
      'chunked',
    ]);

nock('https://testapi.spelpaus.se:443', { encodedQueryParams: true })
  .post('/api/marketing-subjectid/20', {
    requestId: 'nock_id',
    items: [
      { itemId: '182701303', subjectId: '182701303' },
      { itemId: '78903849944432423', subjectId: '78903849944432423' },
    ],
  })
  .reply(400,
    {
      'Items[1].SubjectId': [
        'The field SubjectId must be a string or array type with a maximum length of \'12\'.',
      ],
    },
    [
      'Connection',
      'close',
      'Date',
      'Tue, 19 Feb 2019 10:09:05 GMT',
      'Content-Type',
      'application/json; charset=utf-8',
      'Transfer-Encoding',
      'chunked',
    ]);

nock('https://testapi.spelpaus.se:443', { encodedQueryParams: true })
  .post('/api/marketing-subjectid/20', {
    requestId: 'nock_id',
    items: [
      { itemId: '182701303378', subjectId: '182701303378' },
      { itemId: '1234', subjectId: '1234' },
    ],
  })
  .reply(400, 'Invalid item at position 2', [
    'Connection',
    'close',
    'Date',
    'Tue, 19 Feb 2019 10:09:05 GMT',
    'Content-Type',
    'text/plain',
    'Content-Length',
    '26',
  ]);
