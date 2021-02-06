import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const getHelloHandler = async (): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    body: `Hello World, this is Connext faucet`,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  };
};
