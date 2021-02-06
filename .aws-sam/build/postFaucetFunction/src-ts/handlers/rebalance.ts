import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const rebalanceHandler = async (): Promise<APIGatewayProxyResult> => {
  // add rebalancing code

  return {
    statusCode: 200,
    body: `Hello World, this is Connext faucet`,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  };
};
