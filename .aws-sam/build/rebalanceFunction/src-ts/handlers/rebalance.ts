import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MaticPOSClient } from "@maticnetwork/maticjs";
import { ChannelSigner } from "@connext/vector-utils";
import { providers, Wallet } from "ethers";

type RebalanceConfig = {
  maticAssetId: string;
  maticAssetIdDecimals: string;
  ethAssetId: string;
  ethAssetIdDecimals: string;
  targetRatio: number;
  allowedDeviationPct: number;
}[];

const ETH_CHAIN_ID = 1;
const MATIC_CHAIN_ID = 137;

export const rebalanceHandler = async (): Promise<APIGatewayProxyResult> => {
  const chainProviders = JSON.parse(process.env.CHAIN_PROVIDERS);
  const rebalanceConfig: RebalanceConfig = JSON.parse(
    process.env.REBALANCE_CONFIG
  );

  const pk = JSON.parse(process.env.ROUTER_KEY);
  const routerSigner = new ChannelSigner(pk);
  console.log("routerSigner.publicIdentifier: ", routerSigner.publicIdentifier);
  console.log("routerSigner.address: ", routerSigner.address);
  console.log("chainProviders: ", chainProviders);

  const parentProvider = chainProviders[ETH_CHAIN_ID];
  const maticProvider = chainProviders[MATIC_CHAIN_ID];

  const parentEthProvider = new providers.JsonRpcProvider(parentProvider);
  const maticEthProvider = new providers.JsonRpcProvider(parentProvider);

  const parentWallet = new Wallet(pk).connect(parentEthProvider);
  const maticWallet = new Wallet(pk).connect(maticEthProvider);

  const maticPOSClient = new MaticPOSClient({
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
