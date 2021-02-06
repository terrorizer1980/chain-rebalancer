"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHelloHandler = void 0;
const getHelloHandler = async () => {
    return {
        statusCode: 200,
        body: `Hello World, this is Connext faucet`,
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
    };
};
exports.getHelloHandler = getHelloHandler;
//# sourceMappingURL=get-hello.js.map