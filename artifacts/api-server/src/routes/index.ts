import { Router, type IRouter } from "express";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.get("/openai/status", (_req, res) => {
  res.json({ configured: Boolean(process.env.OPENAI_API_KEY) });
});

export default router;
