"""Validate the exact static allowlist and existing upload sources before SSH."""
import base64
import json
import os
from pathlib import Path
import re
import sys

EXPECTED = (
    'images/bonsai/thumbs/IKE-2609-017_top_thumb.jpg',
    'images/bonsai/thumbs/IKE-2609-018_top_thumb.jpg',
    'images/bonsai/thumbs/OV-2608-003_top_thumb.jpg',
    'images/bonsai/thumbs/RD-2606-001_top_thumb.jpg',
    'images/bonsai/thumbs/RD-2606-002_top_thumb.jpg',
    'images/brand/broom_gene.svg',
    'images/brand/scroll_gene.svg',
    'images/favicon-16.png',
    'images/favicon-32.png',
    'images/favicon.svg',
    'offering_gene.jpg',
    'trees/chris-schmuck/azalea/index.html',
    'trees/chris-schmuck/bare-in-the-forest/index.html',
    'trees/chris-schmuck/chris-tree-8/index.html',
    'trees/chris-schmuck/index.html',
    'trees/chris-schmuck/longwood/index.html',
    'trees/chris-schmuck/pitch-pine/index.html',
    'trees/chris-schmuck/tree5/index.html',
    'trees/chris-schmuck/tree6/index.html',
    'trees/chris-schmuck/tree8/index.html',
    'trees/chris-schmuck/unknown/index.html',
    'trees/index.html',
    'trees/jim-alexander/han-shan/index.html',
    'trees/jim-alexander/i-hardly-know-yew/index.html',
    'trees/jim-alexander/index.html',
    'trees/jim-alexander/shih-te/index.html',
)
ORDINARY = ("css", "js", "gallery", "images/curated", "images/system")


def sources(root):
    public = root / "public"
    paths = (root / ".github/deploy/supplemental-public.txt").read_text().splitlines()
    if len(paths) != 26 or set(paths) != set(EXPECTED):
        raise ValueError("Manifest must contain exactly the 26 approved static files")
    all_paths = set(paths)
    all_paths.update(path.relative_to(public).as_posix() for path in public.glob("*.html"))
    for directory in ORDINARY:
        start = public / directory
        if start.is_symlink() or not start.is_dir():
            raise ValueError("Unsafe or missing ordinary source directory")
        for parent, directories, files in os.walk(str(start), followlinks=False):
            if any((Path(parent) / name).is_symlink() for name in directories):
                raise ValueError("Symlinked source directory")
            all_paths.update((Path(parent) / name).relative_to(public).as_posix() for name in files)
    for name in sorted(all_paths) + ["data/trees.json"]:
        if (not re.fullmatch(r"[A-Za-z0-9_./-]+", name)
                or "pieces.json" in name.split("/") or ".." in name.split("/")):
            raise ValueError("Unsafe or protected source path")
        source = public / name
        if source.is_symlink() or source.resolve() != public.resolve() / name:
            raise ValueError("Redirected source")
        if not source.is_file() or source.stat().st_nlink != 1:
            raise ValueError("Missing, non-regular, or hard-linked source")
    return sorted(all_paths)


if __name__ == "__main__":
    paths = sources(Path(__file__).resolve().parents[2])
    if sys.argv[1:] == ["--targets"]:
        print(base64.b64encode(json.dumps(paths).encode("utf-8")).decode("ascii"))
    elif not sys.argv[1:]:
        print("Validated 26 supplemental files and existing static sources; inventory excluded.")
    else:
        raise SystemExit("Unexpected arguments")
