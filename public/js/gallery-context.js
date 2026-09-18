// Record fields are authoritative; never infer gallery context from an ID or referrer.
export function getGalleryContext(piece) {
  const category = clean(piece.category).toLowerCase();
  const raw = clean(piece.shape).toUpperCase();
  const aliases = {
    OVAL: "OV", OVALS: "OV", ROUND: "RD", ROUNDS: "RD", RND: "RD",
    RECT: "RC", RECTANGLE: "RC", RECTANGLES: "RC", REC: "RC",
    FREEFORM: "FF", FREE: "FF", CASCADE: "CS", CASCADES: "CS", SLAB: "SL", SLABS: "SL",
    IK: "IKE", IKEBANA: "IKE", FACE: "FJ", FACEJUG: "FJ", FACEJUGS: "FJ",
    "FACE JUG": "FJ", "FACE JUGS": "FJ", SCULPTURE: "S"
  };
  const shape = aliases[raw] || raw;
  const bonsai = {
    OV: ["Ovals", "ovals"], RD: ["Rounds", "rounds"], RC: ["Rectangles", "rectangles"],
    FF: ["Freeform", "freeform"], CS: ["Cascade", "cascade"], SL: ["Slabs", "slabs"]
  };
  const ceramic = {
    IKE: ["Ikebana Vessel", "Ikebana", "ikebana"],
    FJ: ["Face Jug", "Face Jugs", "facejugs"],
    S: ["Sculpture", "Sculpture", "sculpture"]
  };
  if (category === "bonsai") {
    const form = bonsai[shape];
    return { categoryLabel: "Bonsai Container", returnLabel: `Back to ${form ? form[0] : "Bonsai"}`,
      returnUrl: `/gallery/${form ? form[1] : "bonsai"}.html` };
  }
  if (category === "ceramic" && ceramic[shape]) {
    const [categoryLabel, label, route] = ceramic[shape];
    return { categoryLabel, returnLabel: `Back to ${label}`, returnUrl: `/gallery/${route}.html` };
  }
  return { categoryLabel: "Piece", returnLabel: "Back to Practice", returnUrl: "/practice.html" };
}

// Shared unchanged presentation rules from shape-gallery.js; canonical values stay intact.
export function formatDimensions(piece, shapeCode) {
  const direct = clean(piece.dimensions);

  if (direct) {
    return formatDimensionString(direct, shapeCode);
  }

  const length = clean(piece.length);
  const width = clean(piece.width);
  const height = clean(piece.height);

  if (length && width && height) {
    if (isZero(length)) {
      return `${width} in. W × ${height} in. H`;
    }

    return `${length} × ${width} × ${height} in.`;
  }

  if (width && height) {
    return `${width} in. W × ${height} in. H`;
  }

  if (height) {
    return `${height} in. H`;
  }

  return "";
}

function formatDimensionString(value, shapeCode) {
  const raw = clean(value);

  const parts = raw
    .replace(/in\.?/gi, "")
    .split("×")
    .map(part => clean(part));

  if (parts.length === 3 && isZero(parts[0])) {
    return `${parts[1]} in. W × ${parts[2]} in. H`;
  }

  return raw;
}

function isZero(value) {
  const raw = clean(value);
  return raw === "0" || raw === "0.0" || raw === "0.00";
}

function clean(value) {
  return String(value ?? "").trim();
}
