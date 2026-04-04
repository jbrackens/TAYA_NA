/* @flow */
const { mergeMap } = require('rxjs/operators');
const { createProducerSubject, createConsumerSubject } = require('./bus');

type Data = {
  prop1: number,
  prop2: string,
  prop3: boolean,
};

describe('Kafka', () => {
  const timeStamp = new Date().getTime();
  const data = {
    prop1: 1,
    prop2: 'text',
    prop3: true,
  };

  it('can produce message', async () => {
    const subject = await createProducerSubject<Data>(`test-topic${timeStamp}`);
    subject.next(data);
  });

  it('can consume message', () => new Promise((resolve, reject) => createConsumerSubject<Data>(`test-topic${timeStamp}`, true).then(({ consumer, subject }) => {
    subject.subscribe({ next: payload => {
      try {
        expect(payload).to.deep.equal({
          name: `test-topic${timeStamp}`,
          data,
        });
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        consumer.disconnect();
      }
    } });
  })));

  it('can produce many message', async () => {
    const subject = await createProducerSubject<Data>(`test-topic-2${timeStamp}`);
    subject.next([data, data, data]);
    subject.next(data);
    subject.next(data);
  });

  it('can consume many message', () => {
    let counter = 0;
    return new Promise((complete) => createConsumerSubject<Data>(`test-topic-2${timeStamp}`, true).then(({ consumer, subject }) => {
      subject.pipe(mergeMap(payload => new Promise((resolve) => {
        console.log(payload); // eslint-disable-line no-console
        resolve();
      }))).subscribe({
        next: () => {
          counter += 1;
          if (counter === 2) {
            consumer.disconnect();
            complete();
          }
        },
      });
    }));
  });
});
