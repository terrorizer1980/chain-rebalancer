"use strict";
// import path from "path";
// import dotenv from "dotenv";
Object.defineProperty(exports, "__esModule", { value: true });
// dotenv.config();
const env = process.env.NODE_ENV || "development";
const debug = env !== "production";
const port = process.env.PORT || (debug ? 5050 : 5000);
const host = process.env.HOST || `0.0.0.0:${port}`;
const clientUrl = process.env.CONNEXT_CLIENT_URL || `http://host.docker.internal:5040`;
const clientSecret = process.env.CONNEXT_CLIENT_SECRET;
const twitter = {
    consumer: {
        key: process.env.TWITTER_CONSUMER_API_KEY || "",
        secret: process.env.TWITTER_CONSUMER_API_SECRET || "",
    },
    access: {
        key: process.env.TWITTER_ACCESS_API_KEY || "",
        secret: process.env.TWITTER_ACCESS_API_SECRET || "",
    },
};
const tokenAddress = process.env.TOKEN_ADDRESS || "0x38cF23C52Bb4B13F051Aec09580a2dE845a7FA35";
const tokenLimit = process.env.TOKEN_LIMIT || "3000000000000000000";
exports.default = {
    env: env,
    debug: debug,
    port,
    host,
    clientUrl,
    clientSecret,
    twitter,
    tokenAddress,
    tokenLimit,
};
//# sourceMappingURL=index.js.map