import { Router } from "express";
import { FXController } from "../controllers/fxController";

const fxRouter = Router();

fxRouter.post(`/predict`, FXController.makePrediction);

export default fxRouter;

