import app from './app/index.js';

import dotenv from 'dotenv';
import connectDB from './config/db.config';

dotenv.config();

const PORT = process.env.PORT || 1337;

connectDB().then(() =>
{
    app.listen(PORT, () =>
    {
        console.log(`Server running on port ${PORT}`);
    });
});
