import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import walletsRouter from "./wallets";
import requestsRouter from "./requests";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(walletsRouter);
router.use(requestsRouter);
router.use(dashboardRouter);

export default router;
