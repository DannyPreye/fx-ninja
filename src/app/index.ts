import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import defaultRouter from './route/defaultRoute';
// import userRoutes from './routes/userRoutes';
// import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';

const app: Application = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use(`/api/v1`, defaultRouter);
// app.use('/api/users', userRoutes);

// Error Handling
// app.use(notFoundHandler);
// app.use(errorHandler);

export default app;
