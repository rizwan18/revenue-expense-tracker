import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { asyncHandler, FriendlyError } from "../middleware/errorHandler";

const router = Router();
router.use(requireAuth);

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/jpg"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const householdId = (req as AuthedRequest).householdId || "unknown";
    const safeName = `${householdId}-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error("Only PDF, JPG and PNG files can be attached."));
    }
    cb(null, true);
  },
});

router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.householdId) throw new FriendlyError("Please finish setting up your household first.", 400);
    if (!req.file) throw new FriendlyError("Please choose a file to upload.");

    const { transactionId, propertyId, investmentId, dividendId, capitalGainDisposalId } = req.body as Record<string, string | undefined>;

    // Files are user-scoped: served back only via the authenticated download
    // route below, never a raw static path, so another household can never
    // guess a URL to someone else's receipt.
    const document = await prisma.document.create({
      data: {
        householdId: req.householdId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        filePath: req.file.filename,
        transactionId: transactionId || null,
        propertyId: propertyId || null,
        investmentId: investmentId || null,
        dividendId: dividendId || null,
        capitalGainDisposalId: capitalGainDisposalId || null,
      },
    });
    res.status(201).json(document);
  })
);

router.get(
  "/:id/download",
  asyncHandler(async (req: AuthedRequest, res) => {
    const document = await prisma.document.findFirst({ where: { id: req.params.id, householdId: req.householdId ?? undefined } });
    if (!document) throw new FriendlyError("We couldn't find this document.", 404);
    const filePath = path.join(UPLOAD_DIR, document.filePath);
    if (!fs.existsSync(filePath)) throw new FriendlyError("This file is no longer available.", 404);
    res.download(filePath, document.fileName);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const document = await prisma.document.findFirst({ where: { id: req.params.id, householdId: req.householdId ?? undefined } });
    if (!document) throw new FriendlyError("We couldn't find this document.", 404);
    const filePath = path.join(UPLOAD_DIR, document.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.document.delete({ where: { id: document.id } });
    res.json({ message: "Document removed." });
  })
);

export default router;
