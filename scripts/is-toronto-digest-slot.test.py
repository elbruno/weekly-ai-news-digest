import importlib.util
import sys
import unittest
from datetime import date
from pathlib import Path


SCRIPT = Path(__file__).with_name("is-toronto-digest-slot.py")
SPEC = importlib.util.spec_from_file_location("is_toronto_digest_slot", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class TorontoDigestScheduleTests(unittest.TestCase):
    def test_selects_daylight_saving_slot(self):
        monday = date(2026, 10, 26)

        self.assertTrue(MODULE.should_run("0 10 * * 1-5", monday))
        self.assertFalse(MODULE.should_run("0 11 * * 1-5", monday))

    def test_selects_standard_time_slot(self):
        monday = date(2026, 11, 2)

        self.assertFalse(MODULE.should_run("0 10 * * 1-5", monday))
        self.assertTrue(MODULE.should_run("0 11 * * 1-5", monday))

    def test_rejects_unrecognized_schedules(self):
        with self.assertRaisesRegex(ValueError, "Unsupported digest schedule"):
            MODULE.should_run("0 12 * * 1-5", date(2026, 10, 26))


if __name__ == "__main__":
    unittest.main()
