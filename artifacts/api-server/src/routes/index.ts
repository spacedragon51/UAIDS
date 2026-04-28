import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import sampleRouter from "./sample.js";
import datasetRouter from "./dataset.js";
import modelRouter from "./model.js";
import fairnessRouter from "./fairness.js";
import monitorRouter from "./monitor.js";
import complianceRouter from "./compliance.js";
import reviewRouter from "./review.js";
import clinicalRouter from "./clinical.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sampleRouter);
router.use(datasetRouter);
router.use(modelRouter);
router.use(fairnessRouter);
router.use(monitorRouter);
router.use(complianceRouter);
router.use(reviewRouter);
router.use(clinicalRouter);

export default router;
