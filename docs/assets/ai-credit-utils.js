(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.AiCreditUsage = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function isoDay(date) {
    return date.toISOString().slice(0, 10);
  }

  function isPreferred(candidate, current) {
    var candidateScheduled = candidate.event === "schedule";
    var currentScheduled = current.event === "schedule";
    if (candidateScheduled !== currentScheduled) return candidateScheduled;

    var timeDifference =
      Date.parse(candidate.timestamp) - Date.parse(current.timestamp);
    return timeDifference > 0 ||
      (timeDifference === 0 && Number(candidate.runId) > Number(current.runId));
  }

  function selectDailyRuns(runs) {
    var selected = new Map();
    runs.forEach(function (run) {
      var key = isoDay(new Date(run.timestamp));
      var current = selected.get(key);
      if (!current || isPreferred(run, current)) selected.set(key, run);
    });
    return Array.from(selected.values()).sort(function (left, right) {
      return Date.parse(left.timestamp) - Date.parse(right.timestamp) ||
        Number(left.runId) - Number(right.runId);
    });
  }

  function periodKey(timestamp, period) {
    var date = new Date(timestamp);
    if (period === "daily") return isoDay(date);
    if (period === "monthly") return date.toISOString().slice(0, 7);

    var monday = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ));
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    return isoDay(monday);
  }

  function aggregate(runs, period) {
    var groups = new Map();
    runs.forEach(function (run) {
      var key = periodKey(run.timestamp, period);
      var item = groups.get(key) || { key: key, days: 0, aic: 0 };
      item.days += 1;
      item.aic += Number(run.aic);
      groups.set(key, item);
    });
    return Array.from(groups.values()).sort(function (left, right) {
      return left.key.localeCompare(right.key);
    });
  }

  return {
    aggregate: aggregate,
    selectDailyRuns: selectDailyRuns,
  };
});
