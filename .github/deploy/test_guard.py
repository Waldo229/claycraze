"""Local-only guard tests; fixtures stay inside this integration worktree."""
import contextlib
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("guard", Path(__file__).with_name("guard-trees.py"))
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class GuardTests(unittest.TestCase):
    def setUp(self):
        review = ROOT / ".local-deploy-review"
        review.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=review)
        self.root = Path(self.temp.name)
        assert self.root.resolve().is_relative_to(ROOT.resolve())
        self.addCleanup(self.temp.cleanup)
        (self.root / "data").mkdir()
        self.current = self.root / "data/trees.json"
        self.candidate = self.root / "data/.trees-candidate-1-1.json"
        self.keep = [{"id": "ironwood", "species": "Maple", "value": 1}]
        self.old = self.keep + [{"id": "test", "title": "Test"}]
        for name in guard.OBSOLETE:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("obsolete")

    def run_guard(self, old, new):
        self.current.write_text(json.dumps(old))
        self.candidate.write_text(json.dumps(new))
        with contextlib.redirect_stdout(io.StringIO()):
            guard.apply(self.root, self.candidate.name)

    def test_remove_only_test_and_exact_cleanup(self):
        sentinel = self.root / "images/trees/chris-schmuck/keep.jpg"
        sentinel.write_text("keep")
        self.run_guard(self.old, self.keep)
        self.assertEqual(json.loads(self.current.read_text()), self.keep)
        self.assertFalse(self.candidate.exists())
        for name in guard.OBSOLETE:
            self.assertFalse((self.root / name).exists())
        self.assertFalse((self.root / guard.TEST_DIRECTORY).exists())
        self.assertEqual(sentinel.read_text(), "keep")

    def test_identical_and_repeated_cleanup(self):
        self.run_guard(self.keep, self.keep)
        self.run_guard(self.keep, self.keep)

    def test_nonempty_directory_is_retained(self):
        sentinel = self.root / guard.TEST_DIRECTORY / "keep.txt"
        sentinel.write_text("keep")
        self.run_guard(self.old, self.keep)
        self.assertEqual(sentinel.read_text(), "keep")

    def test_reject_other_record_changes_without_cleanup(self):
        changed = copy.deepcopy(self.keep)
        changed[0]["species"] = "Oak"
        cases = [changed, [], self.keep + [{"id": "new"}], self.old]
        for candidate in cases:
            with self.subTest(candidate=candidate):
                with self.assertRaises(ValueError):
                    self.run_guard(self.old, candidate)
                self.assertEqual(json.loads(self.current.read_text()), self.old)
                self.assertTrue(all((self.root / name).exists() for name in guard.OBSOLETE))

    def test_reject_type_order_and_duplicate_test_changes(self):
        for before, after in [
            ([{"id": "a", "v": 1}], [{"id": "a", "v": True}]),
            ([{"id": "a"}, {"id": "b"}], [{"id": "b"}, {"id": "a"}]),
            (self.old + [{"id": "test"}], self.keep),
        ]:
            with self.assertRaises(ValueError):
                self.run_guard(before, after)

    def test_invalid_json(self):
        for raw in [b"{", b"null", b"{}", b"[null]", b'[{"id": 1}]',
                    b'[{"id":"a","id":"b"}]', b'[{"id":"a","v":NaN}]']:
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                guard.records(raw)

    def test_formatting_and_key_order_are_not_record_changes(self):
        guard.approved(guard.records(b'[{"id":"a","v":1}]'),
                       guard.records(b'[ { "v": 1, "id": "a" } ]'))

    def test_decimal_differences_are_not_rounded_away(self):
        before = guard.records(b'[{"id":"a","value":1.0000000000000000001}]')
        after = guard.records(b'[{"id":"a","value":1.0000000000000000002}]')
        with self.assertRaises(ValueError):
            guard.approved(before, after)

    def test_missing_current_aborts(self):
        self.candidate.write_text("[]")
        with self.assertRaises(FileNotFoundError):
            guard.apply(self.root, self.candidate.name)
        self.assertFalse(self.candidate.exists())

    def test_invalid_candidate_name_aborts(self):
        with self.assertRaises(ValueError):
            guard.apply(self.root, "../trees.json")

    def test_directory_at_file_target_aborts(self):
        path = self.root / guard.OBSOLETE[0]
        path.unlink()
        path.mkdir()
        with self.assertRaises(ValueError):
            self.run_guard(self.old, self.keep)

    def test_current_change_during_validation_aborts(self):
        original = guard.approved
        def changed(current, candidate):
            original(current, candidate)
            self.current.write_text('[{"id":"publisher-update"}]')
        with patch.object(guard, "approved", changed), self.assertRaises(ValueError):
            self.run_guard(self.old, self.keep)
        self.assertEqual(json.loads(self.current.read_text()), [{"id": "publisher-update"}])
        self.assertTrue(all((self.root / name).exists() for name in guard.OBSOLETE))

    def test_reads_only_current_and_candidate(self):
        original = Path.read_bytes
        seen = []
        def read(path):
            seen.append(path)
            return original(path)
        with patch.object(Path, "read_bytes", read):
            self.run_guard(self.old, self.keep)
        self.assertEqual(set(seen), {self.current, self.candidate})

    def test_validate_retains_candidate_then_apply_removes_it(self):
        self.current.write_text(json.dumps(self.old))
        self.candidate.write_text(json.dumps(self.keep))
        guard.validate(self.root, self.candidate.name)
        self.assertTrue(self.candidate.exists())
        self.assertEqual(json.loads(self.current.read_text()), self.old)
        guard.apply(self.root, self.candidate.name)
        self.assertFalse(self.candidate.exists())
        guard.cleanup_candidate(self.root, self.candidate.name)

    def test_failures_remove_only_candidate(self):
        for operation in (guard.validate, guard.apply):
            for before, after in [("{", "[]"), ("[]", "{"), ("[]", '[{"id":"new"}]')]:
                with self.subTest(operation=operation.__name__, before=before, after=after):
                    self.current.write_text(before)
                    self.candidate.write_text(after)
                    with self.assertRaises(ValueError):
                        operation(self.root, self.candidate.name)
                    self.assertFalse(self.candidate.exists())
                    self.assertEqual(self.current.read_text(), before)
                    self.assertTrue(all((self.root / name).exists() for name in guard.OBSOLETE))

    def test_preflight_is_nonmutating(self):
        self.current.write_text(json.dumps(self.old))
        before = {p.relative_to(self.root): p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        guard.preflight(self.root, self.candidate.name, ["index.html", "trees/new/index.html"])
        after = {p.relative_to(self.root): p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        self.assertEqual(before, after)
        self.assertFalse((self.root / "trees/new").exists())

    def test_preflight_accepts_only_exact_offering_root_jpeg_without_mutation(self):
        self.current.write_text("[]")
        offering = self.root / "offering_gene.jpg"
        for exists in (False, True):
            if exists:
                offering.write_bytes(b"image fixture")
            before = {p.relative_to(self.root): p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
            with self.subTest(exists=exists), patch.object(Path, "read_bytes", autospec=True,
                                                         side_effect=Path.read_bytes) as read:
                guard.preflight(self.root, self.candidate.name, ["index.html", "offering_gene.jpg"])
                self.assertEqual([call.args[0] for call in read.call_args_list], [self.current])
            after = {p.relative_to(self.root): p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
            self.assertEqual(before, after)

    def test_preflight_rejects_unapproved_root_images_and_protected_targets(self):
        for name in ["other.jpg", "offering_gene.jpeg", "offering_gene.jpg.bak",
                     "OFFERING_GENE.JPG", "new/offering_gene.jpg", "../offering_gene.jpg",
                     "data/offering_gene.jpg", "data/pieces.json", "images/pieces.json"]:
            with self.subTest(name=name), patch.object(Path, "read_bytes") as read:
                with self.assertRaises(ValueError):
                    guard.preflight(self.root, self.candidate.name, [name])
                read.assert_not_called()

    def test_preflight_offering_still_rejects_directories_and_hardlinks(self):
        offering = self.root / "offering_gene.jpg"
        offering.mkdir()
        with self.assertRaisesRegex(ValueError, "not a regular file"):
            guard.preflight(self.root, self.candidate.name, ["offering_gene.jpg"])
        offering.rmdir()
        self.current.write_text("[]")
        os.link(self.current, offering)
        with self.assertRaisesRegex(ValueError, "Hard-linked"):
            guard.preflight(self.root, self.candidate.name, ["offering_gene.jpg"])

    def test_preflight_rejects_missing_root_current_and_bad_json(self):
        with self.assertRaises(ValueError):
            guard.preflight(self.root / "absent", self.candidate.name, ["index.html"])
        with self.assertRaises(FileNotFoundError):
            guard.preflight(self.root, self.candidate.name, ["index.html"])
        self.current.write_text("{")
        with self.assertRaises(ValueError):
            guard.preflight(self.root, self.candidate.name, ["index.html"])

    def test_preflight_rejects_unwritable_parent(self):
        self.current.write_text("[]")
        original = guard.os.access
        def access(path, mode):
            return False if Path(path) == self.root / "data" else original(path, mode)
        with patch.object(guard.os, "access", access), self.assertRaises(ValueError):
            guard.preflight(self.root, self.candidate.name, ["index.html"])

    def test_preflight_rejects_unreadable_current(self):
        self.current.write_text("[]")
        with patch.object(Path, "read_bytes", side_effect=PermissionError), self.assertRaises(PermissionError):
            guard.preflight(self.root, self.candidate.name, ["index.html"])

    def test_preflight_rejects_existing_candidate(self):
        self.current.write_text("[]")
        self.candidate.write_text("[]")
        with self.assertRaises(ValueError):
            guard.preflight(self.root, self.candidate.name, ["index.html"])
        self.assertTrue(self.candidate.exists())

    def test_rejects_traversal_and_protected_paths_before_reading(self):
        for name in ["../outside", "/absolute", "images/../../outside", "data/pieces.json",
                     "images/pieces.json", "images/bad name.jpg", "trees/a;bad/index.html"]:
            with self.subTest(name=name), patch.object(Path, "read_bytes") as read:
                with self.assertRaises(ValueError):
                    guard.safe_path(self.root, name)
                read.assert_not_called()

    def test_preflight_rejects_data_targets(self):
        self.current.write_text("[]")
        with self.assertRaises(ValueError):
            guard.preflight(self.root, self.candidate.name, ["data/trees.json"])

    def test_hardlinked_current_rejected_before_read(self):
        self.current.write_text("[]")
        os.link(self.current, self.root / "same-inode.json")
        with patch.object(Path, "read_bytes") as read, self.assertRaises(ValueError):
            guard.safe_path(self.root, "data/trees.json")
        read.assert_not_called()

    def test_symlink_target_rejected(self):
        target = self.root / "real.html"
        target.write_text("keep")
        link = self.root / "index.html"
        try:
            link.symlink_to(target)
        except OSError as error:
            self.skipTest("Symlink creation unavailable: " + str(error))
        with self.assertRaises(ValueError):
            guard.safe_path(self.root, "index.html")
        self.assertEqual(target.read_text(), "keep")

    def test_cleanup_failure_still_removes_candidate(self):
        original = guard.remove_if_present
        def remove(path):
            if path == self.root / guard.OBSOLETE[0]:
                raise PermissionError("fixture")
            return original(path)
        with patch.object(guard, "remove_if_present", remove), self.assertRaises(PermissionError):
            self.run_guard(self.old, self.keep)
        self.assertFalse(self.candidate.exists())

    def test_symlink_rejection_with_mocked_filesystem(self):
        self.current.write_text("[]")
        with patch.object(Path, "is_symlink", return_value=True), self.assertRaises(ValueError):
            guard.safe_path(self.root, "data/trees.json")


class ManifestTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location("manifest", ROOT / ".github/deploy/validate-manifest.py")
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)
        review = ROOT / ".local-deploy-review"
        review.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=review)
        self.root = Path(self.temp.name)
        assert self.root.resolve().is_relative_to(ROOT.resolve())
        self.addCleanup(self.temp.cleanup)
        self.manifest = self.root / ".github/deploy/supplemental-public.txt"
        self.manifest.parent.mkdir(parents=True)
        self.manifest.write_text("\n".join(self.module.EXPECTED) + "\n")
        for name in list(self.module.EXPECTED) + ["data/trees.json", "index.html"]:
            path = self.root / "public" / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("fixture")
        for directory in self.module.ORDINARY:
            (self.root / "public" / directory).mkdir(parents=True, exist_ok=True)

    def test_approved_sources(self):
        result = self.module.sources(self.root)
        self.assertEqual(len(result), 27)
        self.assertIn("index.html", result)
        self.assertIn("offering_gene.jpg", result)
        self.assertNotIn("data/trees.json", result)

    def test_all_manifest_sources_pass_remote_preflight(self):
        (self.root / "public/data/trees.json").write_text("[]")
        guard.preflight(self.root / "public", ".trees-candidate-1-1.json",
                        self.module.sources(self.root))

    def test_rejects_unsafe_unapproved_duplicate_and_data_entries(self):
        paths = list(self.module.EXPECTED)
        for name in ["../outside", "images/*", "images/unapproved.jpg", "other.jpg",
                     "offering_gene.jpeg", "data/pieces.json", paths[1]]:
            self.manifest.write_text("\n".join([name] + paths[1:]) + "\n")
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.module.sources(self.root)

    def test_missing_source_rejected(self):
        (self.root / "public" / self.module.EXPECTED[0]).unlink()
        with self.assertRaises(ValueError):
            self.module.sources(self.root)

    def test_hardlinked_source_rejected(self):
        source = self.root / "public" / self.module.EXPECTED[0]
        os.link(source, self.root / "same-inode")
        with self.assertRaises(ValueError):
            self.module.sources(self.root)


if __name__ == "__main__":
    unittest.main(verbosity=2)
