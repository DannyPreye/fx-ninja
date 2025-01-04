import { config } from "dotenv";
config();

export const basicConfig = {
    generativeIA: {
        apiKey: process.env.GOOGLE_AI_API_KEY,

    },
    db: {
        uri: process.env.MONGO_URI,
    },
    server: {
        port: process.env.PORT || 1337,
    },
};
