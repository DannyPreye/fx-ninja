import { PredictService } from "../service/predict.js";
import { Response } from "express";

const forexAnalyze = new PredictService();
export class FXController
{
    // @desc    Predict  forex stock
    // @route   POST /api/v1/fx/predict
    // @access  Public
    static makePrediction = async (req: any, res: Response) =>
    {
        try {

            const { symbol } = req.body;
            const prediction = await forexAnalyze.predictStock(symbol);

            res.status(200).json({
                message: 'Prediction successful',
                data: prediction
            });

        } catch (error) {

        }
    };

}
