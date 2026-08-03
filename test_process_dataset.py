import csv
import importlib.util
import tempfile
import unittest
from pathlib import Path

import pytest


MODULE_PATH = Path(__file__).resolve().parent / "model" / "02_process_dataset.py"
MODULE_SPEC = importlib.util.spec_from_file_location("process_dataset", MODULE_PATH)
if MODULE_SPEC is None or MODULE_SPEC.loader is None:
    raise ImportError(f"Modül yüklenemedi: {MODULE_PATH}")
processor = importlib.util.module_from_spec(MODULE_SPEC)
MODULE_SPEC.loader.exec_module(processor)


class FeatureExtractionTests(unittest.TestCase):
    def test_ip_address_detection_supports_ipv4_and_ipv6(self):
        self.assertEqual(processor.extract_features("http://192.0.2.1/login")["ip_adresi_var_mi"], 1)
        self.assertEqual(processor.extract_features("http://[2001:db8::1]/login")["ip_adresi_var_mi"], 1)
        self.assertEqual(processor.extract_features("https://example.com")["ip_adresi_var_mi"], 0)

    def test_empty_and_non_string_urls_return_safe_defaults(self):
        for value in ("", "   ", None):
            features = processor.extract_features(value)
            self.assertTrue(all(value == 0 or value == "" for value in features.values()))

    def test_protocol_relative_url_is_parsed(self):
        features = processor.extract_features("//sub.example.com/path")
        self.assertEqual(features["alan_adi_uzunlugu"], len("sub.example.com"))
        self.assertEqual(features["alt_alan_adi_sayisi"], 1)

    def test_security_indicators_are_extracted(self):
        features = processor.extract_features(
            "https://google-login.com/login?verify=1&account=alice"
        )
        self.assertEqual(features["https_var_mi"], 1)
        self.assertEqual(features["marka_taklidi_var_mi"], 1)
        self.assertEqual(features["alan_adinda_tire_var_mi"], 1)
        self.assertEqual(features["parametre_sayisi"], 2)
        self.assertGreaterEqual(features["supheli_kelime_sayisi"], 4)

    def test_known_shortener_is_detected(self):
        self.assertEqual(
            processor.extract_features("https://bit.ly/abc")["kisaltma_servisi_mi"], 1
        )


class CsvProcessingTests(unittest.TestCase):
    def test_process_csv_uses_named_label_not_column_position(self):
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "input.csv"
            output_path = Path(directory) / "output.csv"
            input_path.write_text(
                "url,notes,label\nhttps://example.com,benign sample,0\nhttps://bit.ly/x,short link,1\n",
                encoding="utf-8",
            )

            processor.process_csv(str(input_path), str(output_path))

            with output_path.open(newline="", encoding="utf-8") as output:
                rows = list(csv.DictReader(output))
            self.assertEqual([row["is_phishing"] for row in rows], ["0", "1"])
            self.assertEqual(rows[1]["kisaltma_servisi_mi"], "1")

    def test_process_csv_requires_a_label(self):
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "input.csv"
            output_path = Path(directory) / "output.csv"
            input_path.write_text("url\nhttps://example.com\n", encoding="utf-8")
            with pytest.raises(ValueError, match="hedef etiket sütunu bulunamadı"):
                processor.process_csv(str(input_path), str(output_path))
            self.assertFalse(output_path.exists())


if __name__ == "__main__":
    unittest.main()
