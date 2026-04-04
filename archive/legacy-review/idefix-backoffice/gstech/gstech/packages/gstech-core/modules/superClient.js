/* eslint-disable no-unused-expressions */
/* @flow */
import type { $Application } from 'express';

const apps = new Set<$Application<>>();

const superClient = function generic<TClient = any, TResponse = any>(
  app: $Application<express$Request, express$Response>,
  port: number, // TODO: need to get rid of this parameter somehow
  client: TClient,
): {
  call: ((TClient) => Promise<TResponse>) => {
    expect: (statusCode: number, expect?: (response: TResponse) => void) => Promise<TResponse>,
  },
} {
  if (!apps.has(app)) {
    app.listen(port);
    apps.add(app);
  }

  return {
    call: (call) => ({
      expect: (statusCode, expect) =>
        new Promise((resolve, reject) => {
          call(client)
            .then((response) => {
              try {
                expect && expect(response);
              } catch (e) {
                return reject(e);
              }
              return resolve(response);
            })
            .catch((e: { statusCode: number, body: TResponse }) => {
              expect && expect(e.body);
              if (statusCode !== e.statusCode) {
                return reject(
                  `Status code does not match. expected: ${statusCode} actual ${
                    e.statusCode
                  }. ${JSON.stringify(e)}`,
                );
              }
              return resolve(e.body);
            });
        }),
    }),
  };
};

module.exports = superClient;
