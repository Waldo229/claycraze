const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3010;

/* -------------------------
   DATABASE
-------------------------- */
const db = new sqlite3.Database(
  path.join(__dirname, "claycraze_inventory.db"),
  (err) => {
    if (err) {
      console.error("Could not open database:", err.message);
      process.exit(1);
    }
    console.log("Connected to SQLite database.");
  }
);

/* -------------------------
   MIDDLEWARE
-------------------------- */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* Public website root */
app.use(express.static(path.join(__dirname, "public")));

/* Optional extra image mount if you still use a root-level images folder */
app.use("/images", express.static(path.join(__dirname, "images")));

/* -------------------------
   (ALL YOUR EXISTING CODE STAYS EXACTLY THE SAME)
-------------------------- */


/* -------------------------
   START SERVER
-------------------------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Only show local URLs when running locally
  if (!process.env.PORT) {
    console.log(`Home: http://localhost:${PORT}/`);
    console.log(`Theory: http://localhost:${PORT}/theory.html`);
    console.log(`Practice: http://localhost:${PORT}/practice.html`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
    console.log(`Bonsai: http://localhost:${PORT}/gallery/bonsai`);
  }
});