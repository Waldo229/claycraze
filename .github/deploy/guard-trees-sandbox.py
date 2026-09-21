"""Fail closed before the approved sandbox Trees replacement and four-file cleanup."""
import base64
from decimal import Decimal
import errno
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys

OBSOLETE = (
    "data/pieces_BACKUP_before_bonsai_path_fix.json",
    "data/pieces_OLD_STALE_2026-06-29.json",
    "images/trees/chris-schmuck/test.jpg",
    "trees/chris-schmuck/test/index.html",
)
TEST_DIRECTORY = "trees/chris-schmuck/test"


def safe_path(root, relative):
    root = Path(root).absolute()
    parts = PurePosixPath(relative)
    if (not re.fullmatch(r"[A-Za-z0-9_./-]+", relative)
            or parts.is_absolute() or ".." in parts.parts
            or str(parts) != relative or "pieces.json" in parts.parts):
        raise ValueError("Unsafe or protected path")
    path = root / relative
    path.resolve().relative_to(root.resolve())
    for part in [path] + list(path.parents):
        if part == root:
            break
        if part.is_symlink():
            raise ValueError("Symlinks are not permitted")
    if path.is_file() and path.stat().st_nlink != 1:
        raise ValueError("Hard-linked files are not permitted")
    return path


def candidate_path(root, name):
    if not re.fullmatch(r"\.trees-candidate-[0-9]+-[0-9]+\.json", name):
        raise ValueError("Invalid candidate filename")
    return safe_path(root, "data/" + name)


def remove_if_present(path):
    try:
        path.unlink()
    except FileNotFoundError:
        pass


def cleanup_candidate(root, name):
    remove_if_present(candidate_path(root, name))


def writable_parent(path, root):
    directory = path.parent
    while not directory.exists():
        directory = directory.parent
    if not directory.is_dir() or not os.access(str(directory), os.W_OK | os.X_OK):
        raise ValueError("Target parent is not writable/searchable")
    for parent in [directory] + list(directory.parents):
        if not os.access(str(parent), os.X_OK):
            raise ValueError("Target parent is not searchable")
        if parent == root:
            break


def preflight(root, name, targets):
    # Read-only: do not create directories, temporary files, or locks here.
    root = Path(root).absolute()
    if not root.is_dir() or not os.access(str(root), os.W_OK | os.X_OK):
        raise ValueError("Production root is missing or not writable/searchable")
    candidate = candidate_path(root, name)
    if candidate.exists():
        raise ValueError("Run-specific candidate already exists")
    if not isinstance(targets, list) or not targets:
        raise ValueError("Expected explicit static targets")
    for relative in targets:
        if (not isinstance(relative, str) or relative.startswith("data/")
                or not (("/" not in relative and relative.endswith(".html"))
                        or relative == "offering_gene.jpg"
                        or relative.startswith(("css/", "js/", "gallery/", "images/", "trees/")))):
            raise ValueError("Invalid static target")
        target = safe_path(root, relative)
        if target.exists() and not target.is_file():
            raise ValueError("Static target is not a regular file")
        writable_parent(target, root)
    current = safe_path(root, "data/trees.json")
    records(current.read_bytes())
    writable_parent(current, root)
    cleanup_targets(root)  # Validate exact removal targets and their parents.
    print("Read-only remote preflight passed.")


def cleanup_targets(root):
    targets = [safe_path(root, name) for name in OBSOLETE]
    directory = safe_path(root, TEST_DIRECTORY)
    for target in targets:
        if target.exists():
            if not target.is_file():
                raise ValueError("Cleanup target is not a regular file")
            writable_parent(target, root)
    if directory.exists():
        if not directory.is_dir():
            raise ValueError("Test directory is not a directory")
        writable_parent(directory, root)
    return targets, directory


def validate(root, name):
    try:
        current = safe_path(root, "data/trees.json")
        candidate = candidate_path(root, name)
        approved(records(current.read_bytes()), records(candidate.read_bytes()))
        cleanup_targets(root)
        print("Trees candidate accepted before static uploads.")
    except BaseException:
        cleanup_candidate(root, name)
        raise


def unique_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def invalid_constant(value):
    raise ValueError("Non-finite JSON number")


def records(raw):
    value = json.loads(raw.decode("utf-8") if isinstance(raw, bytes) else raw, object_pairs_hook=unique_keys,
                       parse_constant=invalid_constant, parse_float=Decimal)
    if not isinstance(value, list) or any(
        not isinstance(item, dict) or not isinstance(item.get("id"), str)
        for item in value
    ):
        raise ValueError("Expected an array of records with string IDs")
    return value


def canonical(value):
    # Preserve JSON types, record order, and decimal precision without float rounding.
    if isinstance(value, dict):
        return ("object", tuple((key, canonical(item)) for key, item in sorted(value.items())))
    if isinstance(value, list):
        return ("array", tuple(canonical(item) for item in value))
    return (type(value).__name__, value)


def approved(current, candidate):
    if any(item["id"] == "test" for item in candidate):
        raise ValueError("Candidate still exposes Test; cleanup would break it")
    if canonical(current) == canonical(candidate):
        return
    filtered = [item for item in current if item["id"] != "test"]
    if len(current) - len(filtered) != 1 or canonical(filtered) != canonical(candidate):
        raise ValueError("Rejected: difference is not solely removal of Test")


def _apply(root, candidate_name):
    root = Path(root)
    current = safe_path(root, "data/trees.json")
    candidate = candidate_path(root, candidate_name)
    targets, directory = cleanup_targets(root)
    before = current.read_bytes()
    proposed = candidate.read_bytes()
    approved(records(before), records(proposed))
    # Keep the existing permissions and detect a publisher update during validation.
    os.chmod(candidate, stat.S_IMODE(current.stat().st_mode))
    if current.read_bytes() != before or candidate.read_bytes() != proposed:
        raise ValueError("Trees changed during validation; retry after review")
    os.replace(candidate, current)  # Same directory/filesystem: atomic replacement.
    for target in targets:
        remove_if_present(target)
    try:
        directory.rmdir()  # Never recurse; retain a nonempty directory.
    except OSError as error:
        if error.errno not in (errno.ENOENT, errno.ENOTEMPTY, errno.EEXIST):
            raise
    print("Trees guard passed; exact obsolete-file cleanup completed.")


def apply(root, name):
    try:
        _apply(root, name)
    finally:
        cleanup_candidate(root, name)


if __name__ == "__main__":
    if (len(sys.argv) not in (4, 5)
            or sys.argv[2] != "/home/customer/www/sandbox.claycraze.com/public_html"):
        raise SystemExit("Unexpected deployment root or arguments")
    if sys.version_info < (3, 6):
        raise SystemExit("Python 3.6 or newer is required")
    mode, root, name = sys.argv[1:4]
    try:
        if mode == "preflight" and len(sys.argv) == 5:
            targets = json.loads(base64.b64decode(sys.argv[4], validate=True).decode("utf-8"))
            preflight(root, name, targets)
        elif mode == "validate" and len(sys.argv) == 4:
            validate(root, name)
        elif mode == "apply" and len(sys.argv) == 4:
            apply(root, name)
        elif mode == "cleanup" and len(sys.argv) == 4:
            cleanup_candidate(root, name)
        else:
            raise ValueError("Invalid guard mode")
    except Exception:
        # Do not emit feed contents, SSH arguments, credentials, or a traceback.
        raise SystemExit("Deployment guard failed; review runtime, permissions, paths, and Trees records.")
