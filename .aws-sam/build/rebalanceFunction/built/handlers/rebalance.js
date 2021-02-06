"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebalanceHandler = void 0;
const maticjs_1 = require("@maticnetwork/maticjs");
const vector_utils_1 = require("@connext/vector-utils");
const ethers_1 = require("ethers");
const ETH_CHAIN_ID = 1;
const MATIC_CHAIN_ID = 137;
const rebalanceHandler = async () => {
    const chainProviders = JSON.parse(process.env.CHAIN_PROVIDERS);
    const rebalanceConfig = JSON.parse(process.env.REBALANCE_CONFIG);
    const pk = JSON.parse(process.env.ROUTER_KEY);
    const routerSigner = new vector_utils_1.ChannelSigner(pk);
    console.log("routerSigner.publicIdentifier: ", routerSigner.publicIdentifier);
    console.log("routerSigner.address: ", routerSigner.address);
    console.log("chainProviders: ", chainProviders);
    const parentProvider = chainProviders[ETH_CHAIN_ID];
    const maticProvider = chainProviders[MATIC_CHAIN_ID];
    const parentEthProvider = new ethers_1.providers.JsonRpcProvider(parentProvider);
    const maticEthProvider = new ethers_1.providers.JsonRpcProvider(parentProvider);
    const parentWallet = new ethers_1.Wallet(pk).connect(parentEthProvider);
    const maticWallet = new ethers_1.Wallet(pk).connect(maticEthProvider);
    const maticPOSClient = new maticjs_1.MaticPOSClient({
        network: "mainnet",
        version: "v1",
        parentProvider,
        maticProvider,
    });
    // check router signer address balances against ratios
    for (const rebalance of rebalanceConfig) {
        // const parentBalance = await parentEthProvider;
    }
    // rebalance between matic/mainnet as necessary
    // https://docs.matic.network/docs/develop/ethereum-matic/pos/using-sdk/erc20
    return {
        statusCode: 200,
        body: JSON.stringify({ matic: maticPOSClient.network }),
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
    };
};
exports.rebalanceHandler = rebalanceHandler;
//# sourceMappingURL=rebalance.js.map