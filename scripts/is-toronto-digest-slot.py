#!/usr/bin/env python3
"""Select the UTC cron slot that corresponds to 6:00 AM in Toronto."""

from __future__ import annotations

import argparse
from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo


SCHEDULE_HOURS_UTC = {
    "0 10 * * 1-5": 10,
    "0 11 * * 1-5": 11,
}


def should_run(schedule: str, utc_date: date) -> bool:
    try:
        hour = SCHEDULE_HOURS_UTC[schedule]
    except KeyError as error:
        raise ValueError(f"Unsupported digest schedule: {schedule}") from error

    scheduled_utc = datetime.combine(
        utc_date,
        time(hour=hour),
        tzinfo=timezone.utc,
    )
    toronto_time = scheduled_utc.astimezone(ZoneInfo("America/Toronto"))
    return toronto_time.hour == 6 and toronto_time.minute == 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("schedule")
    args = parser.parse_args()

    selected = should_run(args.schedule, datetime.now(timezone.utc).date())
    print("true" if selected else "false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
