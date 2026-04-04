// @flow
const CAMPAIGN_STATUSES = ['draft', 'running', 'active', 'archived'];
const REWARD_TRIGGERS = ['deposit', 'login', 'registration', 'instant'];
const BANNER_LOCATIONS = {
  LD: ['nonloggedin', 'frontpage', 'deposit', 'game-sidebar', 'myaccount-rewards'],
  CJ: [
    'nonloggedin',
    'frontpage',
    'deposit',
    'myjefe-level',
    'myjefe-bounty',
    'myjefe-wheel',
    'level',
    'bounty',
    'wheel',
  ],
  KK: ['nonloggedin', 'frontpage', 'deposit', 'game-leaderboard', 'game-sidebar', 'myaccount-shop'],
  FK: ['nonloggedin', 'frontpage', 'deposit', 'game-leaderboard'],
  OS: ['nonloggedin', 'frontpage', 'deposit', 'game-leaderboard', 'game-sidebar', 'myaccount-shop'],
  SN: ['nonloggedin', 'frontpage', 'deposit', 'game-leaderboard'],
  VB: ['nonloggedin', 'frontpage', 'deposit', 'game-leaderboard'],
};

module.exports = {
  CAMPAIGN_STATUSES,
  REWARD_TRIGGERS,
  BANNER_LOCATIONS,
};
