<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>ClaycrazE | Piece Detail</title>

  <link rel="stylesheet" href="/css/styles.css?v=101" />
</head>

<body class="practice-page">

  <header class="site-header">
    <div class="header-shell">

      <a class="site-brand" href="/index.html">
        <span class="site-title">ClaycrazE</span>
        <span class="site-tag">Theory &amp; Practice</span>
      </a>

      <button
        class="nav-toggle"
        id="navToggle"
        aria-expanded="false"
        aria-controls="siteNav"
        aria-label="Open navigation"
        type="button"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav class="site-nav" id="siteNav" aria-label="Main navigation">
        <a href="/index.html">Home</a>
        <a href="/theory.html">Theory</a>
        <a href="/practice.html">Practice</a>
      </nav>

    </div>
  </header>

  <main class="gallery-page">

    <section
      id="pieceRoot"
      class="piece-root"
      aria-live="polite"
    >
      <div class="loading">
        Loading piece...
      </div>
    </section>

  </main>

  <script src="/js/nav.js?v=101"></script>
  <script src="/js/piece.js?v=101"></script>

</body>
</html>