import { Router } from "express";
import fxRouter from "../fx/routes/fxRoutes.js";

const defaultRouter = Router();

defaultRouter.use("/fx", fxRouter);

export default defaultRouter;
