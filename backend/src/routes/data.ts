import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler, FriendlyError } from "../middleware/errorHandler";
import { buildExportCsv } from "../services/dataTransfer/exportData";
import { runImport } from "../services/dataTransfer/importData";

const router = Router();
router.use(requireAuth);

function householdOf(req: AuthedRequest): string {
  if (!req.householdId) throw new FriendlyError("Please finish setting up your household first.", 400);
  return req.householdId;
}

// Download everything in the household as one CSV file.
router.get(
  "/export",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const csv = await buildExportCsv(householdId, req.userId!);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="revenue-expense-tracker-${stamp}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    // The leading BOM makes Excel read the file as UTF-8.
    res.send("\uFEFF" + csv);
  })
);

const importSchema = z.object({
  csv: z.string().min(1, "Please choose a file."),
  /** true = only report what would happen; false = actually import. */
  dryRun: z.boolean().default(true),
  /** Also apply the name, timezone and display preferences saved in the file. */
  includeProfile: z.boolean().default(true),
});

router.post(
  "/import",
  asyncHandler(async (req: AuthedRequest, res) => {
    const householdId = householdOf(req);
    const { csv, dryRun, includeProfile } = importSchema.parse(req.body);
    const result = await runImport(csv, householdId, req.userId!, { dryRun, includeProfile });
    res.json(result);
  })
);

export default router;
