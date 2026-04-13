import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import walletsRouter from "./wallets";
import requestsRouter from "./requests";
import dashboardRouter from "./dashboard";
import messagesRouter from "./messages";
import reportsRouter from "./reports";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(walletsRouter);
router.use(requestsRouter);
router.use(dashboardRouter);
router.use(messagesRouter);
router.use(reportsRouter);
router.use(usersRouter);

export default router;
