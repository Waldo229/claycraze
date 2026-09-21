const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const CURATE_JS = fs.readFileSync(
  path.join(ROOT, "admin", "js", "curate.js"),
  "utf8"
);

function makeElement() {
  return {
    value: "",
    textContent: "",
    className: "",
    innerHTML: "",
    disabled: false,
    files: [],
    attributes: {},
    options: [],
    addEventListener() {},
    appendChild(child) {
      this.options.push(child);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    classList: {
      add() {},
      remove() {},
    },
  };
}

function makeResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(payload);
    },
  };
}

function loadCurator(fetchImpl = async () => makeResponse(200, [])) {
  const elements = new Map();
  const document = {
    addEventListener() {},
    createElement() {
      return makeElement();
    },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement());
      return elements.get(id);
    },
  };

  const context = vm.createContext({
    console: { log() {}, error() {} },
    document,
    fetch: fetchImpl,
    FileReader: function FileReader() {},
    URL: { createObjectURL: () => "blob:test" },
    window: {
      setTimeout(callback) {
        callback();
      },
    },
  });

  vm.runInContext(CURATE_JS, context, { filename: "curate.js" });
  return { context, element: id => document.getElementById(id) };
}

test("curator retries while Render restores pottery records", async () => {
  let calls = 0;
  const pieces = [{ id: "OV-2609-001", title: "Oval Bonsai Container" }];
  const { context, element } = loadCurator(async () => {
    calls += 1;
    return calls === 1
      ? makeResponse(503, {
          ok: false,
          code: "CURATION_DATA_NOT_READY",
          error: "Pottery records are still being restored.",
        })
      : makeResponse(200, pieces);
  });

  const result = await context.loadPiecesFresh();

  assert.equal(calls, 2);
  assert.equal(JSON.stringify(result), JSON.stringify(pieces));
  assert.match(element("topStatusBox").textContent, /restoring/i);
  assert.equal(
    element("topStatusBox").textContent,
    element("statusBox").textContent
  );
});

test("mode and status changes remain visible beside both Save buttons", () => {
  const { context, element } = loadCurator();

  context.setCreateMode();
  assert.equal(element("topSaveButton").textContent, "Create New Piece");
  assert.equal(element("saveButton").textContent, "Create New Piece");
  assert.equal(element("createModeButton").attributes["aria-pressed"], "true");
  assert.match(element("topStatusBox").textContent, /Create mode/);

  context.showStatus("Saved.", "success");
  assert.equal(element("topStatusBox").textContent, "Saved.");
  assert.equal(element("statusBox").textContent, "Saved.");
  assert.match(element("topStatusBox").className, /success/);
});

test("GENE drafting controls produce visible output", () => {
  const { context, element } = loadCurator();
  element("shape").value = "IKE";
  element("surfaceCharacter").value = "quiet green ash";
  element("mood").value = "restrained";
  element("suggestedUse").value = "an autumn branch";

  context.generateDescription();
  assert.match(element("geneOutput").value, /Ikebana Vessel/);
  assert.match(element("geneOutput").value, /quiet green ash/);

  context.suggestPrice();
  assert.match(element("geneOutput").value, /\$35–125/);

  context.generateWineLabel();
  assert.match(element("geneOutput").value, /Ikebana Vessel/);

  context.generateLaoTzu();
  assert.match(element("geneOutput").value, /autumn branch/);
});

test("server refuses a false empty list before startup registration", () => {
  const server = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");

  assert.match(server, /app\.get\("\/gallery-data\/all", async/);
  assert.match(server, /code: "CURATION_DATA_NOT_READY"/);
  assert.match(server, /res\.status\(503\)/);
});
