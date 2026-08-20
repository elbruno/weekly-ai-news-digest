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

  function isMeasured(run) {
    return run.aic !== null && run.aic !== undefined &&
      Number.isFinite(Number(run.aic)) &&
      (run.conclusion === undefined || run.conclusion === "success") &&
      (run.published === undefined || run.published === true);
  }

  function selectDailyRuns(runs, variant) {
    var selected = new Map();
    runs.forEach(function (run) {
      if (variant && run.variant !== variant) return;
      if (!isMeasured(run)) return;
      var key = isoDay(new Date(run.timestamp));
      var current = selected.get(key);
      if (!current || isPreferred(run, current)) selected.set(key, run);
    });
    return Array.from(selected.values()).sort(function (left, right) {
      return Date.parse(left.timestamp) - Date.parse(right.timestamp) ||
        Number(left.runId) - Number(right.runId);
    });
  }

  function pairBySnapshot(runs) {
    var pairs = new Map();
    runs.forEach(function (run) {
      if (!run.snapshotId || !["control", "economy"].includes(run.variant)) return;
      var pair = pairs.get(run.snapshotId) || {
        snapshotId: run.snapshotId,
        timestamp: run.timestamp,
        control: null,
        economy: null,
      };
      var current = pair[run.variant];
      if (!current || isPreferred(run, current)) pair[run.variant] = run;
      if (Date.parse(run.timestamp) > Date.parse(pair.timestamp)) {
        pair.timestamp = run.timestamp;
      }
      pairs.set(run.snapshotId, pair);
    });
    return Array.from(pairs.values()).sort(function (left, right) {
      return Date.parse(left.timestamp) - Date.parse(right.timestamp);
    });
  }

  function summarizeVariant(runs, variant) {
    var selected = runs.filter(function (run) {
      return run.variant === variant;
    });
    var measured = selected.filter(isMeasured);
    var totalAic = measured.reduce(function (sum, run) {
      return sum + Number(run.aic);
    }, 0);
    var durations = measured.filter(function (run) {
      return Number.isFinite(Number(run.durationSeconds));
    });
    var totalDuration = durations.reduce(function (sum, run) {
      return sum + Number(run.durationSeconds);
    }, 0);
    return {
      runs: selected.length,
      successful: selected.filter(function (run) {
        return run.conclusion === "success";
      }).length,
      published: selected.filter(function (run) {
        return run.published === true;
      }).length,
      measured: measured.length,
      totalAic: totalAic,
      averageAic: measured.length ? totalAic / measured.length : 0,
      averageDurationSeconds: durations.length ? totalDuration / durations.length : 0,
    };
  }

  function summarizePairs(pairs) {
    var complete = pairs.filter(function (pair) {
      return pair.control && pair.economy &&
        isMeasured(pair.control) && isMeasured(pair.economy);
    });
    var controlAic = complete.reduce(function (sum, pair) {
      return sum + Number(pair.control.aic);
    }, 0);
    var economyAic = complete.reduce(function (sum, pair) {
      return sum + Number(pair.economy.aic);
    }, 0);
    var savedAic = controlAic - economyAic;
    return {
      total: pairs.length,
      complete: complete.length,
      controlAic: controlAic,
      economyAic: economyAic,
      savedAic: savedAic,
      savingsPercent: controlAic ? (savedAic / controlAic) * 100 : 0,
    };
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
    pairBySnapshot: pairBySnapshot,
    selectDailyRuns: selectDailyRuns,
    summarizePairs: summarizePairs,
    summarizeVariant: summarizeVariant,
  };
});
