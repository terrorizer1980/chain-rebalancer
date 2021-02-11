import { TAddress, TIntegerString, TPublicIdentifier } from '@connext/vector-types';
import { getSignerAddressFromPublicIdentifier } from '@connext/vector-utils';
import { MaticPOSClient } from '@maticnetwork/maticjs';
import { Static, Type } from '@sinclair/typebox';
import Ajv from 'ajv';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { depositToMatic } from './rebalance';

import response from '/opt/nodejs/defaultResponses';

export const RebalanceParamsSchema = Type.Object({
  amount: TIntegerString,
  assetId: TAddress,
  direction: Type.String(),
  routerAddress: TPublicIdentifier,
});
export type RebalanceParams = Static<typeof RebalanceParamsSchema>;

export default async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Received event: ', event);
  const body = JSON.parse(event.body);
  const params: RebalanceParams = {
    amount: body.amount,
    assetId: body.assetId,
    direction: body.direction,
    routerAddress: body.routerAddress,
  };
  const ajv = new Ajv({ strict: false });
  const validate = ajv.compile(RebalanceParamsSchema);
  const valid = validate(params);

  if (!valid) {
    return response.error(500, {}, new Error(validate.errors?.map((err) => err.message).join(',')));
  }

  const network = !!process.env.MAINNET ? 'mainnet' : 'testnet';
  const version = !!process.env.MAINNET ? 'v1' : 'mumbai';

  const maticPOSClient = new MaticPOSClient({
    network,
    version,
    parentProvider: process.env.PARENT_PROVIDER,
    maticProvider: process.env.MATIC_PROVIDER,
  });

  try {
    if (params.direction === 'deposit') {
      await depositToMatic(
        maticPOSClient,
        params.assetId,
        params.amount,
        getSignerAddressFromPublicIdentifier(params.routerAddress)
      );
    }
  } catch (e) {
    return response.error(500, {}, e);
  }

  return response.success(200, {}, { message: 'Hello World!' });
};
