import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createApp } from "./app";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const app = createApp();

// Self-hosted / single-process mode: if the frontend has been built
// (`npm run build`), serve it from this same server so the whole app runs on
// one port. In development the Vite dev server handles the frontend instead,
// and on Vercel static files are served by the CDN, so neither is affected.
const frontendDist = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(path.join(frontendDist, "index.html"))) {
  app.use(express.static(frontendDist));
  // SPA fallback so React Router deep links (e.g. /properties/abc123) work.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Revenue Expense Tracker listening on http://localhost:${PORT}`);
});
