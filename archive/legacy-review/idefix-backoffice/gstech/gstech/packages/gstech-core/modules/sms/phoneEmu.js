/* @flow */
const { Subject } = require('rxjs');

const subj: rxjs$Subject<Object> = new Subject();

const send = function generic<T: Object>(payload: T) {
  subj.next(payload);
};
const registerReceiver = function generic<T: Object>(handler: (payload: T) => void) {
  subj.subscribe({ next: (p) => handler(p) });
};

module.exports = {
  send,
  registerReceiver,
};
