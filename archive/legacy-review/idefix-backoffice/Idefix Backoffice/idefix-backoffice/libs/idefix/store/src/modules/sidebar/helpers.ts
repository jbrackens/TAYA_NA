// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck
import sumBy from "lodash/fp/sumBy";
import isArray from "lodash/fp/isArray";
import moment from "moment-timezone";
import isEmpty from "lodash/fp/isEmpty";
import { BadgeValue, PlayerWithUpdate } from "app/types";

function getSumTasks(tasks = []) {
  return tasks.reduce((acc, obj) => acc + obj.count, 0);
}

function filteredBadges(badgeValues = []) {
  return badgeValues.map(({ tasks, ...rest }) => ({ ...rest, tasks: getSumTasks(tasks) }));
}

function findTasksByType(tasks, byType) {
  return tasks.filter(({ type }) => type === byType);
}

export const calculateValues = (badgeValues?: BadgeValue | BadgeValue[], forBrand?: boolean) => {
  if (badgeValues) {
    if (forBrand) {
      return {
        tasks: getSumTasks(badgeValues.tasks),
        docs: badgeValues.docs as number,
        withdrawals: badgeValues.withdrawals as number,
        online: badgeValues.online as number
      };
    }

    return {
      tasks: sumBy("tasks", filteredBadges(badgeValues)),
      docs: sumBy("docs", badgeValues),
      withdrawals: sumBy("withdrawals", badgeValues),
      online: sumBy("online", badgeValues)
    };
  }
};

export const calculateTasksValues = (tasks, tasksList) => {
  const result = tasksList?.reduce((acc, current) => ({ ...acc, [current.id]: 0 }), {});

  if (!isArray(tasks)) {
    for (const key in result) {
      result[key] = sumBy("count", findTasksByType(tasks.tasks, key));
    }
  } else {
    for (const key in result) {
      const count = tasks.reduce((acc, obj) => sumBy("count", findTasksByType(obj.tasks, key)) + acc, 0);

      result[key] = count;
    }
  }

  return result;
};

export const formatAutoWdTime = (timestamp: string) => {
  const now = moment();
  const pending = moment(timestamp);
  const diff = now.diff(pending);
  const duration = moment.duration(diff);
  const asHours = Math.floor(duration.asHours());
  const minutes = duration.minutes();

  return `${Math.abs(asHours) - 1}:${Math.abs(minutes) < 10 ? "0" + Math.abs(minutes) : Math.abs(minutes)}`;
};

export const formatPendingTime = (timestamp: string) => {
  const now = moment();
  const pending = moment(timestamp);
  const diff = now.diff(pending);
  const duration = moment.duration(diff);
  const asHours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  if (asHours > 0) {
    return `Added ${asHours}h ${minutes}m ago`;
  }
  return `Added ${minutes}m ago`;
};

export const displayType = (player: PlayerWithUpdate, filter: string) => {
  const result = [];
  if (!isEmpty(player.kycDocumentIds)) {
    result.push("Documents");
  }
  if (!isEmpty(player.fraudIds)) {
    result.push("Frauds");
  }
  if (filter === "withdrawals" && player.totalAmount) {
    result.push(`${player.totalAmount}`);
  } else if (!isEmpty(player.withdrawals)) {
    result.push("Withdrawal");
  }
  return result.join(", ");
};

export const findFirstAutoWd = (autoWithdrawals: PlayerWithUpdate["withdrawals"]) => {
  const compare = (a: { delayedAcceptTime: string }, b: { delayedAcceptTime: string }) => {
    if (Date.parse(a.delayedAcceptTime) > Date.parse(b.delayedAcceptTime)) {
      return 1;
    } else {
      return -1;
    }
  };
  const sortedAutoWd = autoWithdrawals.sort(compare);
  return sortedAutoWd[0];
};

export const getAdditionalInfo = (player: PlayerWithUpdate) => {
  const fullName = `${player.firstName} ${player.lastName}`;
  const isAccountClosed = player.accountClosed || player.accountSuspended || player.gamblingProblem;
  const pendingTimeOfFirstWD = player.withdrawals.length && player.withdrawals[player.withdrawals.length - 1].timestamp;
  const autoWithdrawals = player.withdrawals.filter(withdrawal => withdrawal.delayedAcceptTime !== null);
  return { fullName, isAccountClosed, pendingTimeOfFirstWD, autoWithdrawals };
};
