import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MaticPOSClient } from "@maticnetwork/maticjs";

export const rebalanceHandler = async (): Promise<APIGatewayProxyResult> => {
  const providers = JSON.parse(process.env.CHAIN_PROVIDERS);
  console.log("providers: ", providers);

  const parentProvider = providers["1"];
  const maticProvider = providers["137"];

  const maticPOSClient = new MaticPOSClient({
    network: "mainnet",
    version: "v1",
    parentProvider,
    maticProvider,
  });

  // check router signer address balances against ratios

  // rebalance between matic/mainnet as necessary

  // https://docs.matic.network/docs/develop/ethereum-matic/pos/using-sdk/erc20

  return {
    statusCode: 200,
    body: `Hello World, this is Connext faucet`,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  };
};
