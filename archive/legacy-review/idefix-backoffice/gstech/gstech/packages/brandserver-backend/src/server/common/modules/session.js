/* @flow */
const api = require('../api');
const logger = require('../logger');
const { money } = require('../money');
const { handleError } = require('../extensions');

const logout = async (req: express$Request): Promise<{ok: boolean, e?: Error}> => {
  try {
    if (req.session != null && req.session.SessionKey != null) {
      await api.SessionLogout({ sessionKey: req.session.SessionKey });
    }
    req.session.destroy();
  } catch (e) {
    logger.warn('Logout failed', e);
    return { ok: false, e };
  }
  return { ok: true };
};

const isValidSession = async (req: express$Request, fullCheck: boolean = false): Promise<boolean> => {
  if (req.session != null && req.session.SessionKey != null) {
    if (fullCheck) {
      try {
        const x = await api.SessionCheck({ sessionKey: req.session.SessionKey });
        if (x.IsLoggedIn === 'true') {
          return true;
        }
        req.session.destroy();
        return false;
      } catch (x) {
        logger.debug('Invalid session!', x);
        req.session.destroy();
        return false;
      }
    }
    return true;
  }
  return false;
};

const logoutHandler = (req: express$Request, res: express$Response): express$Response => {
  const lang = req.context.languageISO || 'en';
  logout(req);
  return res.redirect(`/${lang}/`);
};

const logoutApiHandler = (req: express$Request, res: express$Response) => {
  logout(req);
  res.send({ ok: true })
};

const statisticsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const statistics = await api.SessionGetSessionStatistics({ sessionKey: req.session.SessionKey }).then(statistics => {
      const lost = parseInt(statistics.AmountLost);
      const { details } = req.user;
      return {
        AmountBet: parseInt(statistics.AmountBet) > 0 ? money(req, statistics.AmountBet, details.CurrencyISO) : undefined,
        AmountWin: lost <= 0 ? money(req, Math.abs(lost), details.CurrencyISO) : undefined,
        AmountLost: lost > 0 ? money(req, lost, details.CurrencyISO) : undefined,
        PlayTimeMinutes: parseInt(statistics.PlayTimeMinutes),
      };
    });
    return res.json({
      statistics,
    });
  } catch (e) {
    return handleError(req, res, e);
  }
};

module.exports = { logout, isValidSession, statisticsHandler, logoutHandler, logoutApiHandler };
