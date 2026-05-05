# ClaycrazE Apprentice Inventory

Local-first workflow for creating ClaycrazE piece records from real image files.

## What this does

- Reads raw photos from `incoming/`
- Lets apprentice select only a required top image and optional bottom image
- Auto-generates piece IDs like `OV2605-001`
- Saves real files locally into:
  - `public/images/full/`
  - `public/images/thumbs/`
  - `public/images/archive/`
- Stores records in `data/pieces.json`
- Provides a sales/customer form where SOLD status is derived from sale records
- Includes a one-click deploy button that calls `deploy.sh`

## Install

```bash
npm install
```

## Run

```bash
npm start
```

Open:

```txt
http://localhost:3000/admin
```

## Image workflow

1. Put raw JPG/PNG/WebP images in `incoming/`.
2. Open the admin page.
3. Pick shape, dimensions, top image, and optional bottom image.
4. Use AI suggestion boxes manually for now; replace with API logic later if desired.
5. Save draft or approve & publish.
6. Use the deploy button after configuring `deploy.sh`.

## Configure deploy

Edit `deploy.sh` and replace:

```txt
YOUR_SG_USER
YOUR_SG_HOST
/home/YOUR_SG_USER/public_html
```

Test first with:

```bash
./deploy.sh --dry-run
```

Then deploy from the admin button or run:

```bash
./deploy.sh
```

## Important

Run this locally or behind a protected admin area. Do not expose the deploy button publicly.
