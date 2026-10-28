"""Semantic boundary checks for the website's derived scope (no source mutation)."""
import unittest
from build_topic_data import classify_scope, sanitize, csv_bytes


class ScopeTests(unittest.TestCase):
    def setUp(self):
        self.standard = dict(composition_class="ternary", material_scope="organic", measurement_type="experimental", junction_class="single_junction", spectrum="AM 1.5 G", irradiance_mw_cm2="100", device_area_cm2="0.04")

    def test_unknown_is_not_documented(self):
        self.assertEqual(classify_scope({}, "binary")[0], "unresolved")
        self.assertEqual(classify_scope(self.standard, "ternary"), ("documented", []))

    def test_inclusive_one_square_centimetre_boundary(self):
        self.assertEqual(classify_scope(dict(self.standard, device_area_cm2="0.999"), "ternary")[0], "documented")
        self.assertIn("area_ge_1", classify_scope(dict(self.standard, device_area_cm2="1"), "ternary")[1])
        self.assertIn("area_ge_1", classify_scope(dict(self.standard, aperture_area_cm2="1"), "ternary")[1])

    def test_module_and_indoor_separate_from_standard(self):
        self.assertIn("module_or_tandem", classify_scope(dict(self.standard, junction_class="series_connected_module"), "ternary")[1])
        self.assertIn("indoor_light", classify_scope(dict(self.standard, illuminance_lux="1000", irradiance_mw_cm2="0.3"), "ternary")[1])
        self.assertEqual(classify_scope(dict(self.standard, device_area_cm2="10", illuminance_lux="1000"), "indoor")[0], "indoor")

    def test_solar_simulator_is_not_a_computational_simulation(self):
        self.assertEqual(classify_scope(dict(self.standard, spectrum="simulated AM1.5G", light_source_type="solar simulator"), "ternary")[0], "documented")
        self.assertIn("simulation", classify_scope(dict(self.standard, measurement_type="simulation"), "ternary")[1])

    def test_no_spectrum_inference_from_irradiance(self):
        self.assertEqual(classify_scope(dict(self.standard, spectrum="AM1.5"), "ternary")[0], "unresolved")
        self.assertEqual(classify_scope(dict(self.standard, spectrum="", illumination_class="am1_5g_100mw_cm2"), "ternary")[0], "documented")

    def test_public_download_sanitization(self):
        result = sanitize({"doi":"10.1234/example", "processing":{"solvent":"CF"}, "astra_result_file":"private.json", "source_path":"C:/private/article.txt"})
        self.assertEqual(result, {"doi":"10.1234/example", "processing":{"solvent":"CF"}})
        self.assertIn(b"'=HYPERLINK", csv_bytes([{"value":"=HYPERLINK(1)"}], ["value"]))


if __name__ == "__main__":
    unittest.main()
