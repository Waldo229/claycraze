<?php
// SiteGround must authenticate this folder through Security > Protected URLs.
// Never trust HTTP_X_REMOTE_USER or any other client-supplied identity header.
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');
header("Content-Security-Policy: frame-ancestors 'none'");
// This folder MUST remain protected by SiteGround Protected URLs.
// PHP_AUTH_USER identifies the Basic-auth user; SiteGround must validate the password.
// It must never be treated as authentication on an unprotected URL.
$user = '';
foreach (['REMOTE_USER', 'REDIRECT_REMOTE_USER', 'PHP_AUTH_USER'] as $field) {
    $candidate = $_SERVER[$field] ?? '';
    if (is_string($candidate) && trim($candidate) !== '') {
        $user = $candidate;
        break;
    }
}
if (!is_string($user) || trim($user) === '') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Mission Control requires operator clearance.');
}

// Firing notes belong to a mission and are kept outside the public web root.
if (isset($_GET['firing_notes'])) {
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    function note_reply($status, $body) {
        http_response_code($status);
        exit(json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
    }
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if (!in_array($method, ['GET', 'POST'], true)) note_reply(405, ['ok'=>false, 'error'=>'Method not allowed.']);
    if (($_SERVER['HTTP_X_GENE_NOTES'] ?? '') !== '1') note_reply(403, ['ok'=>false, 'error'=>'Open notes from Mission Control.']);
    $input = [];
    if ($method === 'POST') {
        $body = file_get_contents('php://input', false, null, 0, 20001);
        if (strlen($body) > 20000) note_reply(413, ['ok'=>false, 'error'=>'Note is too long.']);
        $input = json_decode($body, true);
        if (!is_array($input)) note_reply(400, ['ok'=>false, 'error'=>'Invalid note.']);
    }
    $mission = $method === 'POST' ? ($input['mission_id'] ?? '') : ($_GET['mission_id'] ?? '');
    if (!is_string($mission) || trim($mission) === '' || strlen($mission) > 200) note_reply(400, ['ok'=>false, 'error'=>'A saved mission is required.']);
    $directory = dirname(__DIR__, 2) . '/gene-firing-notes';
    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) note_reply(503, ['ok'=>false, 'error'=>'Firing note storage is unavailable.']);
    $path = $directory . '/' . hash('sha256', $mission) . '.jsonl';
    if ($method === 'POST') {
        $text = $input['text'] ?? '';
        $id = $input['note_id'] ?? '';
        if (!is_string($text) || trim($text) === '' || strlen($text) > 8000 || !is_string($id) || !preg_match('/^[a-zA-Z0-9-]{16,80}$/', $id)) note_reply(400, ['ok'=>false, 'error'=>'Enter a note of up to 8,000 bytes.']);
        $handle = @fopen($path, 'c+');
        if (!$handle || !flock($handle, LOCK_EX)) note_reply(503, ['ok'=>false, 'error'=>'Could not save note. Your text is still in the box.']);
        $existing = false;
        while (($line = fgets($handle)) !== false) {
            $entry = json_decode($line, true);
            if (is_array($entry) && ($entry['note_id'] ?? '') === $id) $existing = true;
        }
        if (!$existing) {
            $entry = ['note_id'=>$id, 'mission_id'=>$mission, 'recorded_at'=>gmdate('c'), 'source'=>'human_observation', 'operator'=>$user, 'text'=>trim($text)];
            $line = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE) . "\n";
            $written = fwrite($handle, $line);
            $flushed = fflush($handle);
            if ($written !== strlen($line) || !$flushed) {
                flock($handle, LOCK_UN); fclose($handle);
                note_reply(503, ['ok'=>false, 'error'=>'Could not confirm note storage. Retry with your text retained.']);
            }
        }
        flock($handle, LOCK_UN); fclose($handle);
        note_reply(200, ['ok'=>true]);
    }
    $entries = [];
    if (is_file($path)) {
        $handle = @fopen($path, 'r');
        if (!$handle || !flock($handle, LOCK_SH)) note_reply(503, ['ok'=>false, 'error'=>'Could not read firing notes.']);
        while (($line = fgets($handle)) !== false) {
            $entry = json_decode($line, true);
            if (is_array($entry)) $entries[] = $entry;
        }
        flock($handle, LOCK_UN); fclose($handle);
    }
    note_reply(200, ['ok'=>true, 'mission_id'=>$mission, 'notes'=>$entries]);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GENE Mission Control - ClaycrazE</title>
  <link rel="stylesheet" href="/css/styles.css?v=3031">

  <style>
    :root {
      --gene-bg: #090d10;
      --gene-panel: #101519;
      --gene-line: rgba(222, 211, 184, 0.18);
      --gene-cream: #e7ddc7;
      --gene-muted: #a9a79f;
      --gene-green: #9ac64e;
      --gene-amber: #d3a558;
      --gene-red: #c86155;
    }

    * { box-sizing: border-box; }
    body { margin: 0; }

    .mc-shell {
      width: min(1180px, calc(100% - 28px));
      margin: 34px auto 64px;
    }

    .mc-card {
      color: var(--gene-cream);
      background:
        radial-gradient(circle at 18% 18%, rgba(154, 198, 78, 0.07), transparent 30%),
        linear-gradient(145deg, #101519, #090d10);
      border: 1px solid rgba(231, 221, 199, 0.24);
      border-radius: 28px;
      box-shadow:
        0 24px 60px rgba(0, 0, 0, 0.38),
        inset 0 0 0 8px rgba(255, 255, 255, 0.018);
      overflow: hidden;
    }

    .mc-top {
      padding: 30px 34px 26px;
      border-bottom: 1px solid var(--gene-line);
    }

    .mc-kicker {
      margin: 0 0 8px;
      color: var(--gene-green);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 0.82rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .mc-title {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(2rem, 4vw, 3.5rem);
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .mc-subtitle {
      margin: 12px 0 0;
      color: var(--gene-muted);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 1.05rem;
      line-height: 1.5;
    }

    .mc-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 22px;
      padding: 24px;
    }

    .panel {
      border: 1px solid var(--gene-line);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.012);
      padding: 22px;
    }

    .panel-title {
      margin: 0 0 16px;
      color: var(--gene-cream);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 1.05rem;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .field {
      margin-bottom: 16px;
    }

    .field label {
      display: block;
      margin-bottom: 7px;
      color: var(--gene-green);
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .field input,
    .field textarea {
      width: 100%;
      border: 1px solid rgba(231, 221, 199, 0.22);
      border-radius: 10px;
      background: #0a0f12;
      color: var(--gene-cream);
      padding: 12px 13px;
      font: inherit;
    }

    .field textarea {
      min-height: 110px;
      resize: vertical;
    }

    .field select {
      width: 100%;
      border: 1px solid rgba(231, 221, 199, 0.22);
      border-radius: 10px;
      background: #0a0f12;
      color: var(--gene-cream);
      padding: 12px 13px;
      font: inherit;
    }

    .mission-subsection {
      margin-top: 20px;
      padding-top: 18px;
      border-top: 1px solid rgba(231, 221, 199, 0.12);
    }

    .mission-subsection-title {
      margin: 0 0 13px;
      color: var(--gene-muted);
      font-size: 0.76rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .choice-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .choice-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      min-height: 48px;
      padding: 12px 13px;
      border: 1px solid rgba(231, 221, 199, 0.16);
      border-radius: 10px;
      background: #0a0f12;
      color: var(--gene-cream);
      line-height: 1.35;
      cursor: pointer;
    }

    .choice-card input {
      margin-top: 3px;
      accent-color: var(--gene-green);
    }

    .choice-card strong {
      display: block;
      color: var(--gene-cream);
      font-family: Georgia, "Times New Roman", serif;
      font-weight: 500;
    }

    .choice-card small {
      display: block;
      margin-top: 2px;
      color: var(--gene-muted);
      font-size: 0.78rem;
    }

    .conditional-box {
      display: none;
      margin-top: 12px;
      padding: 14px;
      border: 1px solid rgba(211, 165, 88, 0.28);
      border-radius: 10px;
      background: rgba(211, 165, 88, 0.035);
    }

    .conditional-box.show {
      display: block;
    }

    .inline-note {
      margin: 7px 0 0;
      color: var(--gene-muted);
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .validation-note {
      display: none;
      margin-top: 12px;
      padding: 11px 13px;
      border: 1px solid rgba(200, 97, 85, 0.45);
      border-radius: 9px;
      color: #e5a49b;
      background: rgba(200, 97, 85, 0.055);
      line-height: 1.45;
    }

    .validation-note.show {
      display: block;
    }


    .mini-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .mini-panel {
      padding: 13px;
      border: 1px solid rgba(231, 221, 199, 0.16);
      border-radius: 10px;
      background: #0a0f12;
    }

    .mini-panel label {
      display: block;
      margin-bottom: 7px;
      color: var(--gene-muted);
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .mini-panel input,
    .mini-panel select {
      width: 100%;
      border: 1px solid rgba(231, 221, 199, 0.22);
      border-radius: 8px;
      background: #080c0f;
      color: var(--gene-cream);
      padding: 10px 11px;
      font: inherit;
    }

    .mini-panel textarea {
      width: 100%;
      min-height: 84px;
      border: 1px solid rgba(231, 221, 199, 0.22);
      border-radius: 8px;
      background: #080c0f;
      color: var(--gene-cream);
      padding: 10px 11px;
      font: inherit;
      resize: vertical;
    }

    .mini-panel input[type="file"] {
      padding: 8px;
    }

    .zone-heading {
      margin: 0 0 10px;
      color: var(--gene-green);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 0.9rem;
      font-weight: 500;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .firing-note-entry { padding: 12px 0; border-bottom: 1px solid var(--gene-line); }
    .firing-note-entry p { white-space: pre-wrap; overflow-wrap: anywhere; margin: 6px 0; }
    .firing-note-entry time { color: var(--gene-muted); font-size: .85rem; }
    .heatwork-board {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 14px;
    }

    .heatwork-card {
      padding: 15px;
      border: 1px solid rgba(154, 198, 78, 0.24);
      border-radius: 12px;
      background: rgba(154, 198, 78, 0.025);
    }

    .heatwork-card h3 {
      margin: 0 0 10px;
      color: var(--gene-cream);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 0.95rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 6px 0;
      border-bottom: 1px solid rgba(231, 221, 199, 0.08);
      color: var(--gene-muted);
      font-size: 0.86rem;
    }

    .metric-row:last-child {
      border-bottom: 0;
    }

    .metric-row strong {
      color: var(--gene-cream);
      font-weight: 500;
    }

    .heatwork-estimate {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(154, 198, 78, 0.2);
      color: var(--gene-green);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 1.05rem;
    }

    @media (max-width: 760px) {
      .mini-grid,
      .heatwork-board {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 620px) {
      .choice-grid { grid-template-columns: 1fr; }
    }

    .countdown {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 16px;
    }

    .count-box {
      padding: 18px 10px;
      border: 1px solid rgba(154, 198, 78, 0.28);
      border-radius: 14px;
      text-align: center;
      background: rgba(154, 198, 78, 0.03);
    }

    .count-value {
      display: block;
      color: var(--gene-green);
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(2rem, 5vw, 3.3rem);
      line-height: 1;
    }

    .count-label {
      display: block;
      margin-top: 8px;
      color: var(--gene-muted);
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .status-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 18px;
      border: 1px solid rgba(154, 198, 78, 0.5);
      border-radius: 12px;
      background: rgba(154, 198, 78, 0.04);
    }

    .status-label {
      color: var(--gene-muted);
      font-size: 0.8rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .status-value {
      color: var(--gene-green);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 1.3rem;
      letter-spacing: 0.06em;
    }

    .checklist {
      display: grid;
      gap: 10px;
      margin-top: 18px;
    }

    .checkline {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      color: var(--gene-cream);
      line-height: 1.4;
    }

    .checkline input {
      margin-top: 3px;
      accent-color: var(--gene-green);
    }

    .limitations {
      display: none;
      margin-top: 16px;
      padding: 14px 16px;
      border: 1px solid rgba(211, 165, 88, 0.5);
      border-radius: 10px;
      background: rgba(211, 165, 88, 0.06);
      color: #e5c38b;
    }

    .limitations.show { display: block; }

    .ack {
      display: none;
      margin-top: 14px;
      padding: 12px 14px;
      border: 1px solid rgba(231, 221, 199, 0.18);
      border-radius: 10px;
      color: var(--gene-cream);
      background: rgba(255,255,255,0.01);
    }

    .ack.show { display: block; }


    .status-row {
      display: grid;
      grid-template-columns: 14px 1fr auto;
      align-items: center;
      gap: 10px;
      padding: 9px 0;
      border-bottom: 1px solid rgba(231, 221, 199, 0.08);
      font-family: Consolas, "Courier New", monospace;
      letter-spacing: 0.03em;
    }

    .status-row:last-child { border-bottom: 0; }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #596166;
    }

    .status-row.ok .status-dot { background: var(--gene-green); }
    .status-row.limit .status-dot { background: var(--gene-amber); }
    .status-row.block .status-dot { background: var(--gene-red); }

    .check-status {
      color: var(--gene-muted);
      font-size: 0.82rem;
      letter-spacing: 0.06em;
    }

    .status-row.ok .check-status { color: var(--gene-green); }
    .status-row.limit .check-status { color: var(--gene-amber); }
    .status-row.block .check-status { color: var(--gene-red); }

    .human-authority {
      margin-top: 18px;
      padding: 14px 16px;
      border: 1px solid rgba(231, 221, 199, 0.28);
      border-radius: 10px;
      background: rgba(255,255,255,0.015);
    }

    .human-check {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--gene-cream);
      font-family: Georgia, "Times New Roman", serif;
      letter-spacing: 0.06em;
    }

    .human-check input {
      accent-color: var(--gene-green);
      transform: scale(1.12);
    }

    .button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 22px;
    }

    .mc-button {
      min-height: 50px;
      padding: 12px 20px;
      border-radius: 10px;
      border: 1px solid rgba(154, 198, 78, 0.62);
      background: rgba(154, 198, 78, 0.04);
      color: var(--gene-green);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 0.95rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
    }

    .mc-button:hover:not(:disabled),
    .mc-button:focus-visible:not(:disabled) {
      background: rgba(154, 198, 78, 0.1);
      outline: none;
    }

    .mc-button:disabled {
      cursor: not-allowed;
      color: #676f72;
      border-color: rgba(103,111,114,0.4);
      background: rgba(103,111,114,0.04);
    }

    .mc-button.secondary {
      color: var(--gene-cream);
      border-color: rgba(231,221,199,0.25);
    }

    .mission-note {
      margin: 18px 0 0;
      color: var(--gene-muted);
      font-family: Georgia, "Times New Roman", serif;
      font-style: italic;
      line-height: 1.5;
    }

    .narration {
      min-height: 180px;
      border: 1px solid var(--gene-line);
      border-radius: 14px;
      padding: 18px;
      background: #0a0f12;
      color: var(--gene-cream);
      font-family: Georgia, "Times New Roman", serif;
      line-height: 1.6;
    }

    .narration strong {
      color: var(--gene-green);
      font-weight: 500;
    }

    .mc-footer {
      padding: 0 24px 24px;
      text-align: center;
      color: var(--gene-muted);
      font-family: Georgia, "Times New Roman", serif;
      font-style: italic;
    }

    @media (max-width: 900px) {
      .mc-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 620px) {
      .mc-shell { width: min(100% - 16px, 1180px); }
      .mc-top { padding: 24px 20px; }
      .mc-grid { padding: 16px; }
      .countdown { grid-template-columns: repeat(2, 1fr); }
    }
    .mc-shell { margin: 16px auto 24px; }
    .mc-top { padding: 16px 20px; }
    .mc-title { font-size: 1.6rem; letter-spacing: .02em; }
    .mc-subtitle, .mc-kicker { display: none; }
    .mc-grid { padding: 16px; gap: 12px; }
    .panel { padding: 16px; min-width: 0; }
    .narration { min-height: 0; padding: 12px; }
    .countdown { display: flex; gap: 8px; margin-top: 8px; }
    .count-box { flex: 1; padding: 6px 2px; border: 0; }
    .count-value { font-size: 1.5rem; }
    summary { cursor: pointer; min-height: 44px; padding: 10px 0; }
    .security-pending { margin: 12px 16px 0; padding: 12px; border-left: 3px solid var(--gene-amber); color: var(--gene-cream); }
    @media (max-width:620px) { .mc-grid { padding: 10px; } .mc-button { font-size: 1rem; letter-spacing: 0; } }

    [data-mc-page][hidden], .mc-grid[hidden], #mcHomeNote[hidden] { display: none !important; }
    .mc-grid { grid-template-columns: minmax(0, 1fr); }
    .mc-title a { color: inherit; text-decoration: none; }
    .mc-page-nav { display: grid; gap: 0; padding: 12px 24px; }
    .mc-page-nav a { padding: 16px 8px; color: var(--gene-cream); border-bottom: 1px solid var(--gene-line); text-decoration: none; font: 1.15rem Georgia, serif; }
    .mc-page-nav a:hover, .mc-page-nav a[aria-current="page"] { color: var(--gene-green); }
    .mc-page-nav a:focus-visible, .mc-title a:focus-visible { outline: 2px solid var(--gene-green); outline-offset: 3px; }
    .mc-home-note { padding: 0 32px; color: var(--gene-muted); }
    .mc-card[data-view="detail"] .mc-page-nav { display: flex; flex-wrap: wrap; gap: 4px 18px; }
    .mc-card[data-view="detail"] .mc-page-nav a { font-size: .95rem; padding: 12px 0; }
  </style>
</head>

<body class="practice-page">

  <header class="site-header">
    <div class="header-shell">
      <a class="site-brand" href="/index.html">
        <span class="site-title">ClaycrazE</span>
        <span class="site-tag">Theory &amp; Practice</span>
      </a>

      <nav class="site-nav" aria-label="Main navigation">
        <a href="/index.html">Home</a>
        <a href="/theory.html">Theory</a>
        <a href="/practice.html">Practice</a>
      </nav>
    </div>
  </header>

  <main class="mc-shell">
    <section class="mc-card">

      <header class="mc-top">
        <p class="mc-kicker">GENE / Firing Mission</p>
        <h1 class="mc-title"><a href="/mission-control/" data-mc-link>Mission Control</a></h1>
        <p class="mc-subtitle">
          Define the target. Set the time. Verify readiness. GENE reports its own condition;
          the human alone decides launch or hold.
        </p>
      </header>

      <nav class="mc-page-nav" aria-label="Mission Control pages">
        <a href="/mission-control/?page=firing-plan" data-mc-link data-mc-destination="firing-plan">Firing Plan</a>
        <a href="/mission-control/?page=preflight-readiness" data-mc-link data-mc-destination="preflight-readiness">Preflight Readiness</a>
        <a href="/mission-control/?page=firing-notes" data-mc-link data-mc-destination="firing-notes">Firing Notes</a>
        <a href="/mission-control/?page=gene-narration" data-mc-link data-mc-destination="gene-narration">GENE Narration</a>
        <a href="/mission-control/?page=mission-status" data-mc-link data-mc-destination="mission-status">Mission Status</a>
      </nav>
      <p class="mc-home-note" id="mcHomeNote">Choose a page to plan the firing, check readiness, or follow the record.</p>
      <div class="security-pending" id="clearanceStatus" role="status">Checking operator clearance and the local bridge…</div>
      <div class="mc-grid">

        <section data-mc-page="firing-plan" class="panel">
          <h2 class="panel-title">Firing plan</h2>
          <div class="field"><label for="missionName">Name</label><input id="missionName" type="text" placeholder="Name this firing"></div>
          <div class="field"><label for="launchTime">Date and planned ignition time</label><input id="launchTime" type="datetime-local"></div>
          <div class="field"><label for="missionTarget">Purpose</label><textarea id="missionTarget" placeholder="What do you want this firing to accomplish?"></textarea></div>
          <div class="field"><label for="targetHeatwork">Heat work target</label><input id="targetHeatwork" type="text" placeholder="Example: Cone 10"><p class="inline-note">Record heat work accomplished in your firing notes as evidence becomes available.</p></div>
          <fieldset class="field" style="border:0;padding:0"><legend>Kiln names</legend><div class="choice-grid">
            <label class="choice-card"><input id="kilnRichie" type="checkbox"><span>Richie — electric, oxidation</span></label>
            <label class="choice-card"><input id="kilnPoorBoy" type="checkbox"><span>Poor Boy — gas</span></label>
          </div></fieldset>
          <div class="conditional-box" id="poorBoyAtmosphereBox"><fieldset style="border:0;padding:0"><legend>Poor Boy atmosphere</legend><div class="choice-grid">
            <label class="choice-card"><input type="radio" id="atmosphereOxidation" name="poorBoyAtmosphere" value="Oxidation"><span>Oxidation</span></label>
            <label class="choice-card"><input type="radio" id="atmosphereReduction" name="poorBoyAtmosphere" value="Reduction"><span>Reduction</span></label>
          </div></fieldset></div>

          <div class="validation-note" id="missionValidation"></div>

          <div class="countdown" aria-label="Countdown">
            <div class="count-box">
              <span class="count-value" id="days">00</span>
              <span class="count-label">Days</span>
            </div>
            <div class="count-box">
              <span class="count-value" id="hours">00</span>
              <span class="count-label">Hours</span>
            </div>
            <div class="count-box">
              <span class="count-value" id="minutes">00</span>
              <span class="count-label">Minutes</span>
            </div>
            <div class="count-box">
              <span class="count-value" id="seconds">00</span>
              <span class="count-label">Seconds</span>
            </div>
          </div>

          <p class="mission-note">
            Countdown is presentation and planning only. Ignition remains a human action.
          </p>
        </section>

        <section data-mc-page="preflight-readiness" class="panel">
          <h2 class="panel-title">Preflight Readiness</h2>

          <div class="status-box">
            <div>
              <div class="status-label">GENE status</div>
              <div class="status-value" id="readiness">NOT READY</div>
            </div>
            <div class="status-label">Human authority final</div>
          </div>

          <details><summary>Readiness checks</summary>
          <div class="checklist" id="geneChecks">
            <div class="checkline status-row" data-key="kiln_probe_data">
              <span class="status-dot"></span><span>KILN / PROBE DATA</span><strong class="check-status">WAIT</strong>
            </div>
            <div class="checkline status-row" data-key="camera_network">
              <span class="status-dot"></span><span>CAMERA NETWORK</span><strong class="check-status">WAIT</strong>
            </div>
            <div class="checkline status-row" data-key="camera_stream">
              <span class="status-dot"></span><span>CAMERA STREAM</span><strong class="check-status">WAIT</strong>
            </div>
            <div class="checkline status-row" data-key="audio_stream">
              <span class="status-dot"></span><span>AUDIO STREAM</span><strong class="check-status">WAIT</strong>
            </div>
            <div class="checkline status-row" data-key="local_event_storage">
              <span class="status-dot"></span><span>LOCAL EVENT STORAGE</span><strong class="check-status">WAIT</strong>
            </div>
            <div class="checkline status-row" data-key="memory_comparison">
              <span class="status-dot"></span><span>MEMORY / COMPARISON</span><strong class="check-status">WAIT</strong>
            </div>
            <div class="checkline status-row" data-key="public_transmission">
              <span class="status-dot"></span><span>PUBLIC TRANSMISSION</span><strong class="check-status">WAIT</strong>
            </div>
          </div>

          </details>
          <div class="limitations" id="limitations">
            <strong>READY WITH LIMITATIONS</strong>
            <div id="limitationsList">One or more non-critical mission conditions remain unresolved.</div>
          </div>

          <label class="ack" id="ackBox">
            <input type="checkbox" id="ackLimitations">
            I have seen and accept the stated limitations.
          </label>

          <div class="human-authority">
            <label class="human-check">
              <input type="checkbox" id="humanPresent">
              <span>HUMAN PRESENT AND RESPONSIBLE</span>
            </label>
          </div>

          <div class="button-row">
            <button class="mc-button secondary" id="evaluateButton" type="button" disabled>Run Preflight</button>
            <button class="mc-button" id="launchButton" type="button" disabled>GO for observation</button>
          </div>
        </section>

        <section data-mc-page="firing-notes" class="panel" style="grid-column:1 / -1">
          <h2 class="panel-title">Firing notes</h2>
          <p class="inline-note">Record damper changes, flame, cone evidence, heat work accomplished, or anything worth revisiting. Each entry is timestamped and kept with this mission.</p>
          <div class="field"><label for="firingNote">Your observation</label><textarea id="firingNote" maxlength="8000" placeholder="Example: Damper closed slightly. Flame softened; temperature rise slowed."></textarea></div>
          <button class="mc-button" id="addNoteButton" type="button" disabled>Add note</button>
          <button class="mc-button secondary" id="refreshNotesButton" type="button" disabled>Refresh notes</button>
          <p class="inline-note" id="notesStatus" role="status">Publish the firing plan through preflight to attach notes to a mission.</p>
          <div id="firingNotesList"></div>
        </section>

        <section data-mc-page="gene-narration" class="panel">
          <h2 class="panel-title">GENE Narration</h2>
          <div class="narration" id="narration">
            <strong>GENE:</strong> Mission Control is quiet. No firing has been called.
          </div>
        </section>

        <section data-mc-page="mission-status" class="panel"><h2 class="panel-title">Mission status: <span id="operatorMissionStatus">PLANNED</span></h2>
          <p>GENE reports readiness; the operator decides GO or NO-GO.</p>
          <div class="field"><label for="decisionReason">Decision reason</label><textarea id="decisionReason" maxlength="2000" placeholder="Required for NO-GO, HOLD, SCRUB or ABORT"></textarea></div>
          <div class="button-row" aria-label="Operator mission commands">
          <button class="mc-button" type="button" data-command="NO-GO" disabled>NO-GO</button><button class="mc-button" type="button" data-command="HOLD" disabled>HOLD</button><button class="mc-button" type="button" data-command="RESUME COUNT" disabled>RESUME COUNT</button><button class="mc-button" type="button" data-command="SCRUB" disabled>SCRUB</button><button class="mc-button" type="button" data-command="CONFIRM IGNITION" disabled>CONFIRM IGNITION</button><button class="mc-button" type="button" data-command="ABORT" disabled>ABORT</button><button class="mc-button" type="button" data-command="COOLING" disabled>COOLING</button><button class="mc-button" type="button" data-command="COMPLETE" disabled>COMPLETE</button><button class="mc-button" type="button" data-command="NEW MISSION" disabled>NEW MISSION</button></div>
          <p class="mission-note">ABORT records the decision to end a firing; it does not operate kiln hardware. NEW MISSION must preserve the previous record.</p>
          <details><summary>Mission sequence</summary>
          <div class="narration">
            <strong>1.</strong> Mission target named.<br>
            <strong>2.</strong> Countdown begins.<br>
            <strong>3.</strong> GENE performs preflight and reports readiness.<br>
            <strong>4.</strong> Human decides LAUNCH or HOLD.<br>
            <strong>5.</strong> Human ignites kiln.<br>
            <strong>6.</strong> GENE confirms ignition from evidence.<br>
            <strong>7.</strong> Firing states and narration unfold through the mission.<br>
            <strong>8.</strong> Recovery and debrief close the record.
          </div>

          </details>
          <div class="button-row">
            <a class="mc-button secondary" href="/kilnwatch.html" style="text-decoration:none; display:inline-flex; align-items:center;">Return to GENE</a>
            <a class="mc-button secondary" href="/observatory.html" style="text-decoration:none; display:inline-flex; align-items:center;">Enter Observatory</a>
          </div>
        </section>

      </div>

      <div class="mc-footer">
        Witness. Remember. Transmit.
      </div>

    </section>
  </main>

  <script>
    (() => {
      "use strict";

      const $ = (id) => document.getElementById(id);
      const mcPages = [...document.querySelectorAll("[data-mc-page]")];
      const mcLinks = [...document.querySelectorAll("[data-mc-link]")];
      function showMissionPage(focusHeading = false) {
        const requested = new URL(window.location.href).searchParams.get("page");
        const page = mcPages.find(panel => panel.dataset.mcPage === requested);
        mcPages.forEach(panel => panel.hidden = panel !== page);
        document.querySelector(".mc-grid").hidden = !page;
        document.querySelector(".mc-card").dataset.view = page ? "detail" : "home";
        $("mcHomeNote").hidden = !!page;
        mcLinks.forEach(link => {
          if (page && link.dataset.mcDestination === requested) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
        const heading = page?.querySelector(".panel-title");
        document.title = heading ? `${heading.textContent} | GENE Mission Control` : "GENE Mission Control | ClaycrazE";
        if (focusHeading && heading) { heading.tabIndex = -1; heading.focus(); }
      }
      mcLinks.forEach(link => link.addEventListener("click", event => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        window.history.pushState({}, "", link.href);
        showMissionPage(true);
      }));
      window.addEventListener("popstate", () => showMissionPage(true));
      showMissionPage();

      const statusRows = [...document.querySelectorAll(".status-row")];
      const PREFLIGHT_URL = "http://127.0.0.1:8765/preflight";
      const MISSION_PUBLISH_URL = "http://127.0.0.1:8765/mission-publish";

      // Enabled only after SG clearance and authenticated local bridge both succeed.
      let COMMANDS_ENABLED = false;
      let missionVersion = {mission_id: null, revision: 0};
      let missionRecord = {};
      const commandButtons = [...document.querySelectorAll('[data-command]')];
      let noteSaving = false;
      let pendingNote = null;
      async function notesRequest(method, body, missionId) {
        const url = new URL(window.location.href);
        url.search = "";
        url.searchParams.set("firing_notes", "1");
        if (method === "GET") url.searchParams.set("mission_id", missionId);
        const response = await fetch(url, {
          method, credentials: "same-origin", cache: "no-store",
          headers: {"X-GENE-Notes": "1", "Content-Type": "application/json"},
          ...(body ? {body: JSON.stringify(body)} : {})
        });
        let result;
        try { result = await response.json(); }
        catch (_) { throw new Error("Could not verify notes storage. Your text has been retained."); }
        if (!response.ok || !result.ok) throw new Error(result.error || "Firing notes unavailable.");
        return result;
      }
      async function refreshNotes() {
        const id = missionRecord.mission_id;
        $("firingNotesList").replaceChildren();
        if (!id) {
          $("notesStatus").textContent = "Run preflight to save the plan before adding mission notes.";
          return;
        }
        try {
          const result = await notesRequest("GET", null, id);
          if (missionRecord.mission_id !== id) return;
          for (const note of result.notes) {
            const entry = document.createElement("article");
            entry.className = "firing-note-entry";
            const time = document.createElement("time");
            time.dateTime = note.recorded_at;
            time.textContent = new Date(note.recorded_at).toLocaleString() + " — Your observation";
            const text = document.createElement("p");
            text.textContent = note.text;
            entry.append(time, text);
            $("firingNotesList").append(entry);
          }
          $("notesStatus").textContent = result.notes.length ? "Notes saved with this mission." : "No notes recorded for this mission yet.";
        } catch (error) {
          if (missionRecord.mission_id === id) $("notesStatus").textContent = error.message;
        }
      }
      async function addFiringNote() {
        const text = $("firingNote").value.trim();
        const id = missionRecord.mission_id;
        if (!id || !text || noteSaving) return;
        if (new TextEncoder().encode(text).length > 8000) {
          $("notesStatus").textContent = "Please shorten this note (maximum 8,000 bytes).";
          return;
        }
        if (!pendingNote || pendingNote.text !== text || pendingNote.mission_id !== id) {
          pendingNote = {mission_id:id, text, note_id:crypto.randomUUID()};
        }
        noteSaving = true;
        $("addNoteButton").disabled = true;
        $("notesStatus").textContent = "Saving note…";
        try {
          await notesRequest("POST", pendingNote, id);
          if (missionRecord.mission_id === id) {
            if ($("firingNote").value.trim() === text) $("firingNote").value = "";
            pendingNote = null;
            await refreshNotes();
          }
        } catch (error) { $("notesStatus").textContent = error.message; }
        finally {
          noteSaving = false;
          $("addNoteButton").disabled = !missionRecord.mission_id;
        }
      }
      $("addNoteButton").addEventListener("click", addFiringNote);
      $("refreshNotesButton").addEventListener("click", refreshNotes);
      function syncMission(record) {
        const previousMissionId = missionRecord.mission_id;
        missionRecord = record || {};
        if (previousMissionId !== missionRecord.mission_id) {
          $("firingNote").value = "";
          pendingNote = null;
          refreshNotes();
        }
        $("addNoteButton").disabled = !missionRecord.mission_id || noteSaving;
        $("refreshNotesButton").disabled = !missionRecord.mission_id || noteSaving;
        missionVersion = {mission_id: missionRecord.mission_id ?? null, revision: missionRecord.revision ?? 0};
        publicMissionStatus = missionRecord.mission_status || "PLANNED";
        $("operatorMissionStatus").textContent = publicMissionStatus;
        const states = {
          'NO-GO':['PLANNED','GO','HOLD'], HOLD:['PLANNED','GO','NO-GO'],
          'RESUME COUNT':['HOLD'], SCRUB:['PLANNED','GO','NO-GO','HOLD'],
          'CONFIRM IGNITION':['GO'], ABORT:['GO','FIRING','OBSERVING','UNDERWAY','COOLING'],
          COOLING:['FIRING','OBSERVING','UNDERWAY'], COMPLETE:['COOLING'],
          'NEW MISSION':['SCRUBBED','ABORTED','COMPLETE']
        };
        commandButtons.forEach(button => button.disabled = !COMMANDS_ENABLED || !states[button.dataset.command]?.includes(publicMissionStatus));
        $("evaluateButton").disabled = !COMMANDS_ENABLED || !["PLANNED", "NO-GO", "HOLD"].includes(publicMissionStatus);
        updateLaunchAvailability();
      }
      async function bridgeRequest(url, options = {}) {
        const clearance = await fetch('/mission-control/clearance.php', {cache:'no-store', credentials:'same-origin'});
        let grant;
        try { grant = await clearance.json(); }
        catch (_) { throw new Error('SiteGround operator clearance could not be verified.'); }
        if (!clearance.ok || !grant.ok || !grant.token) throw new Error(grant.error || 'Operator clearance unavailable.');
        const response = await fetch(url, {...options, cache:'no-store', headers:{...options.headers, Authorization:'Bearer ' + grant.token}});
        const result = await response.json();
        if (result.mission_record) syncMission(result.mission_record);
        if (!response.ok || result.ok === false) throw new Error(result.error || 'Bridge request failed.');
        return result;
      }
      async function sendMissionCommand(command) {
        if (!COMMANDS_ENABLED) return;
        if (['GO', 'RESUME COUNT', 'CONFIRM IGNITION'].includes(command) && (missionRecord.preflight_target !== buildPreflightTarget() || new Date(missionRecord.planned_ignition).getTime() !== new Date($("launchTime").value).getTime() || missionRecord.mission_name !== ($("missionName").value.trim() || 'Unnamed firing mission'))) {
          throw new Error('The plan has changed. Publish it and run preflight before proceeding.');
        }
        const result = await bridgeRequest('http://127.0.0.1:8765/mission-command', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({...missionVersion, command, reason:$("decisionReason").value.trim(),
            human_present:$("humanPresent").checked, ack_limitations:$("ackLimitations").checked})
        });
        if (command === 'NEW MISSION') {
          document.querySelectorAll('input,textarea,select').forEach(field => {
            if (field.type === 'checkbox' || field.type === 'radio') field.checked = false;
            else field.value = '';
          });
          geneReadiness = 'NOT READY'; lastPreflightPayload = null; geneLimitations = [];
          renderReadiness(); syncKilnLogic(); updateCountdown();
        }
        $("narration").textContent = 'GENE: ' + (result.mission_record?.narration || 'Decision recorded.');
      }
      let geneReadiness = "NOT READY";
      let geneLimitations = [];
      let lastPreflightPayload = null;
      let publicMissionStatus = "PLANNED";

      function pad(value) {
        return String(value).padStart(2, "0");
      }

      function updateCountdown() {
        const raw = $("launchTime").value;
        if (!raw) {
          ["days", "hours", "minutes", "seconds"].forEach((id) => $(id).textContent = "00");
          return;
        }

        const delta = Math.max(0, new Date(raw).getTime() - Date.now());
        const totalSeconds = Math.floor(delta / 1000);

        $("days").textContent = pad(Math.floor(totalSeconds / 86400));
        $("hours").textContent = pad(Math.floor((totalSeconds % 86400) / 3600));
        $("minutes").textContent = pad(Math.floor((totalSeconds % 3600) / 60));
        $("seconds").textContent = pad(totalSeconds % 60);
      }

      function setStatus(key, state, label) {
        const row = statusRows.find((item) => item.dataset.key === key);
        if (!row) return;

        row.classList.remove("ok", "limit", "block");
        const normalized = String(state || "").toUpperCase();

        if (normalized === "OK") row.classList.add("ok");
        if (normalized === "LIMIT") row.classList.add("limit");
        if (normalized === "BLOCK") row.classList.add("block");

        row.querySelector(".check-status").textContent = label || normalized || "WAIT";
      }

      function selectedPoorBoyAtmosphere() {
        const selected = document.querySelector('input[name="poorBoyAtmosphere"]:checked');
        return selected ? selected.value : "";
      }

      function syncKilnLogic() {
        $("poorBoyAtmosphereBox").classList.toggle("show", $("kilnPoorBoy").checked);
      }

      function missionValidationErrors() {
        const errors = [];

        if (!$("missionTarget").value.trim()) errors.push("Mission target / purpose is required.");
        if (!$("launchTime").value.trim()) errors.push("Planned ignition time is required.");
        if (!$("missionName").value.trim()) errors.push("Firing name is required.");
        if (!$("targetHeatwork").value.trim()) errors.push("Target heat-work is required.");

        const richie = $("kilnRichie").checked;
        const poorBoy = $("kilnPoorBoy").checked;

        if (!richie && !poorBoy) {
          errors.push("Select at least one kiln: Richie and/or Poor Boy.");
        }

        if (poorBoy && !selectedPoorBoyAtmosphere()) {
          errors.push("Poor Boy requires one atmosphere: oxidation or reduction.");
        }

        return errors;
      }

      function renderMissionValidation(errors) {
        const box = $("missionValidation");

        if (!errors.length) {
          box.classList.remove("show");
          box.textContent = "";
          return;
        }

        box.classList.add("show");
        box.textContent = errors.join(" ");
      }

      function buildPreflightTarget() {
        const kilns = [];
        if ($("kilnRichie").checked) kilns.push("Richie - Electric - Oxidation");
        if ($("kilnPoorBoy").checked) kilns.push(`Poor Boy - Gas - ${selectedPoorBoyAtmosphere()}`);
        return [$("missionTarget").value.trim(), `Target heat-work: ${$("targetHeatwork").value.trim()}`, `Kiln assignment: ${kilns.join("; ")}`].join(" | ");
      }

      function publicPreflightItems(payload) {
        const checks = Array.isArray(payload?.checks) ? payload.checks : [];

        return checks.map((check) => {
          const status = String(check?.status ?? check?.state ?? "").toUpperCase();
          const ok = check?.ok === true || status === "OK";

          return {
            name: String(check?.name ?? "Preflight condition"),
            label: String(check?.name ?? "Preflight condition"),
            ok
          };
        });
      }

      function buildPublicMissionRecord(status, narration) {
        const rawLaunch = $("launchTime").value.trim();
        let plannedIgnition = rawLaunch || null;

        if (rawLaunch) {
          const parsed = new Date(rawLaunch);
          if (!Number.isNaN(parsed.getTime())) {
            plannedIgnition = parsed.toISOString();
          }
        }

        return {
          ...missionVersion,
          plan_fields: Object.fromEntries([...document.querySelectorAll('input[id],textarea[id],select[id]')]
            .filter(field => !['humanPresent','ackLimitations','decisionReason','firingNote'].includes(field.id) && field.type !== 'file')
            .map(field => [field.id, {value:field.value, checked:field.checked === true}])),
          preflight_target: buildPreflightTarget(),
          human_present: $("humanPresent").checked,
          ack_limitations: $("ackLimitations").checked,
          mission_name: $("missionName").value.trim() || "Unnamed firing mission",
          target: $("missionTarget").value.trim(),
          planned_ignition: plannedIgnition,
          readiness: geneReadiness,
          mission_status: status || publicMissionStatus || "PLANNED",
          preflight: publicPreflightItems(lastPreflightPayload),
          limitations: Array.isArray(geneLimitations) ? geneLimitations : [],
          narration: narration || "Mission Control is quiet. No firing has been called."
        };
      }

      async function publishPublicMission(status, narration) {
        const record = buildPublicMissionRecord(status, narration);

        return bridgeRequest(MISSION_PUBLISH_URL, {
          method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(record)
        });
      }

      function updateLaunchAvailability() {
        const humanPresent = $("humanPresent").checked;
        const missionValid = missionValidationErrors().length === 0;

        let enabled = humanPresent && missionValid;

        if (geneReadiness === "READY") {
          // no extra GENE gate
        } else if (geneReadiness === "READY WITH LIMITATIONS") {
          enabled = enabled && $("ackLimitations").checked;
        } else {
          enabled = false;
        }

        $("launchButton").disabled = !COMMANDS_ENABLED || !enabled || !["PLANNED", "NO-GO"].includes(publicMissionStatus);
      }

      function renderReadiness() {
        $("limitations").classList.remove("show");
        $("ackBox").classList.remove("show");

        if (geneReadiness === "READY") {
          $("readiness").textContent = "READY";
          $("readiness").style.color = "var(--gene-green)";
        } else if (geneReadiness === "READY WITH LIMITATIONS") {
          $("readiness").textContent = "READY WITH LIMITATIONS";
          $("readiness").style.color = "var(--gene-amber)";
          $("limitations").classList.add("show");
          $("ackBox").classList.add("show");
          $("limitationsList").textContent = geneLimitations.length
            ? geneLimitations.join("; ")
            : "One or more non-critical mission conditions remain unresolved.";
        } else {
          $("readiness").textContent = "NOT READY";
          $("readiness").style.color = "var(--gene-red)";
        }

        updateLaunchAvailability();
      }

      function normalizeChecks(payload) {
        const mapped = {};
        const checks = Array.isArray(payload.checks) ? payload.checks : [];

        for (const check of checks) {
          const name = String(check.name || "").toUpperCase();
          if (name.includes("KILN") || name.includes("PROBE")) mapped.kiln_probe_data = check;
          else if (name.includes("CAMERA NETWORK")) mapped.camera_network = check;
          else if (name.includes("CAMERA STREAM")) mapped.camera_stream = check;
          else if (name.includes("AUDIO")) mapped.audio_stream = check;
          else if (name.includes("LOCAL EVENT")) mapped.local_event_storage = check;
          else if (name.includes("MEMORY") || name.includes("COMPARISON")) mapped.memory_comparison = check;
          else if (name.includes("PUBLIC TRANSMISSION")) mapped.public_transmission = check;
        }

        return mapped;
      }

      async function runPreflight() {
        if (!COMMANDS_ENABLED) return;
        syncKilnLogic();

        const errors = missionValidationErrors();
        renderMissionValidation(errors);

        if (errors.length) {
          geneReadiness = "NOT READY";
          renderReadiness();
          $("narration").innerHTML =
            `<strong>GENE:</strong> Mission definition is incomplete. Mission Control requires the firing profile and kiln assignment before preflight.`;
          return;
        }

        const target = buildPreflightTarget();

        statusRows.forEach((row) => {
          row.classList.remove("ok", "limit", "block");
          row.querySelector(".check-status").textContent = "WAIT";
        });

        $("readiness").textContent = "CHECKING...";
        $("readiness").style.color = "var(--gene-muted)";
        $("launchButton").disabled = true;

        try {
          const url = new URL(PREFLIGHT_URL);
          url.searchParams.set("target", target);

          const payload = await bridgeRequest(url);
          lastPreflightPayload = payload;
          const mapped = normalizeChecks(payload);

          for (const row of statusRows) {
            const check = mapped[row.dataset.key];
            if (!check) {
              setStatus(row.dataset.key, "BLOCK", "NO DATA");
              continue;
            }

            const state = String(
              check.status || check.state || (check.ok === true ? "OK" : "BLOCK")
            ).toUpperCase();

            setStatus(row.dataset.key, state, state);
          }

          geneReadiness = String(
            payload.readiness || payload.gene_readiness || "NOT READY"
          ).toUpperCase();

          geneLimitations = Array.isArray(payload.limitations) ? payload.limitations : [];
          renderReadiness();

          let publicNarration = "";

          if (geneReadiness === "READY") {
            publicNarration = "Preflight complete. I am ready to observe. The GO / NO-GO decision remains yours.";
          } else if (geneReadiness === "READY WITH LIMITATIONS") {
            publicNarration = "I can observe this mission, but stated limitations remain.";
          } else {
            publicNarration = "I am not ready. One or more required witnessing conditions are unavailable.";
          }

          $("narration").innerHTML = `<strong>GENE:</strong> ${publicNarration}`;

          publicMissionStatus = missionRecord.mission_status || "PLANNED";

          try {
            await publishPublicMission(publicMissionStatus, publicNarration);
            $("narration").innerHTML += '<br>Public mission record transmitted and verified.';
          } catch (publishError) {
            $("narration").innerHTML +=
              `<br><br><span style="color:var(--gene-amber);">Public transmission failed: ${publishError.message}</span>`;
          }
        } catch (error) {
          geneReadiness = "NOT READY";
          renderReadiness();
          $("narration").innerHTML =
            `<strong>GENE:</strong> Mission Control could not reach the local preflight bridge. ${error.message}`;
        }
      }

      $("evaluateButton").addEventListener("click", runPreflight);
      $("ackLimitations").addEventListener("change", updateLaunchAvailability);
      $("humanPresent").addEventListener("change", updateLaunchAvailability);

      ["missionName", "missionTarget", "targetHeatwork", "kilnRichie", "kilnPoorBoy"].forEach(id => {
        ["input", "change"].forEach(event => $(id).addEventListener(event, () => {
          syncKilnLogic(); renderMissionValidation([]); updateLaunchAvailability();
        }));
      });

      document.querySelectorAll('input[name="poorBoyAtmosphere"]').forEach((radio) => {
        radio.addEventListener("change", () => {
          renderMissionValidation([]);
          updateLaunchAvailability();
        });
      });

      $("launchTime").addEventListener("change", () => {
        updateCountdown();
        renderMissionValidation([]);
        updateLaunchAvailability();
      });

      $("launchButton").addEventListener("click", async () => {
        if (!COMMANDS_ENABLED || $("launchButton").disabled) return;
        try { await sendMissionCommand('GO'); }
        catch (error) { $("narration").textContent = error.message; }
      });
      commandButtons.forEach(button => button.addEventListener('click', async () => {
        if (button.disabled) return;
        try { await sendMissionCommand(button.dataset.command); }
        catch (error) { $("narration").textContent = error.message; }
      }));
      async function connectBridge() {
        try {
          await bridgeRequest('http://127.0.0.1:8765/health');
          const state = await bridgeRequest('http://127.0.0.1:8765/mission-state');
          COMMANDS_ENABLED = true;
          const record = state.mission_record || {};
          $("missionName").value = record.mission_name || '';
          $("missionTarget").value = record.target || '';
          if (record.planned_ignition) {
            const when = new Date(record.planned_ignition);
            if (!Number.isNaN(when.getTime())) $("launchTime").value = new Date(when.getTime() - when.getTimezoneOffset()*60000).toISOString().slice(0,16);
          }
          Object.entries(record.plan_fields || {}).forEach(([id, saved]) => {
            const field = $(id);
            if (field && !['humanPresent','ackLimitations','decisionReason','firingNote'].includes(id) && field.type !== 'file' && saved && typeof saved === 'object') {
              if (typeof saved.value === 'string') field.value = saved.value;
              field.checked = saved.checked === true;
            }
          });
          syncKilnLogic(); updateCountdown();
          syncMission(record);
          $("evaluateButton").disabled = !['PLANNED','NO-GO','HOLD'].includes(publicMissionStatus);
          $("clearanceStatus").textContent = 'Operator clearance verified. Local bridge connected.';
        } catch (error) {
          COMMANDS_ENABLED = false;
          $("evaluateButton").disabled = true;
          commandButtons.forEach(button => button.disabled = true);
          updateLaunchAvailability();
          $("clearanceStatus").textContent = 'Operator commands unavailable: ' + error.message;
        }
      }
      connectBridge();

      window.setInterval(updateCountdown, 1000);
      syncKilnLogic();
      updateCountdown();
      renderReadiness();
    })();
  </script>

</body>
</html>
