import { TAddress, TBytes32, TIntegerString } from '@connext/vector-types';
import { MaticPOSClient } from '@maticnetwork/maticjs';
import { Static, Type } from '@sinclair/typebox';
import Ajv from 'ajv';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { approveForDeposit, checkDepositStatus, deposit } from './rebalance';

import response from '/opt/nodejs/defaultResponses';

export const RebalanceParamsSchema = Type.Object({
  amount: TIntegerString,
  assetId: TAddress,
  direction: Type.Union([Type.Literal('deposit'), Type.Literal('withdraw')]),
  signer: TAddress,
  type: Type.Union([Type.Literal('approve'), Type.Literal('rebalance'), Type.Literal('status')]),
  txHash: Type.Optional(TBytes32),
});
export type RebalanceParams = Static<typeof RebalanceParamsSchema>;

export default async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Received event: ', event);
  const body = JSON.parse(event.body);
  const params: RebalanceParams = {
    amount: body.amount,
    assetId: body.assetId,
    direction: body.direction,
    signer: body.signer,
    type: body.type,
    txHash: body.txHash,
  };
  const ajv = new Ajv({ strict: false });
  const validate = ajv.compile(RebalanceParamsSchema);
  const valid = validate(params);

  if (!valid) {
    return response.error(500, {}, new Error(validate.errors?.map((err) => err.message).join(',')));
  }

  const network = !!process.env.MAINNET ? 'mainnet' : 'testnet';
  const version = !!process.env.MAINNET ? 'v1' : 'mumbai';
  console.log('network: ', network);
  console.log('version: ', version);
  console.log('process.env.PARENT_PROVIDER: ', process.env.PARENT_PROVIDER);
  console.log('process.env.MATIC_PROVIDER: ', process.env.MATIC_PROVIDER);

  const maticPOSClient = new MaticPOSClient({
    network,
    version,
    parentProvider: process.env.PARENT_PROVIDER,
    maticProvider: process.env.MATIC_PROVIDER,
  });

  try {
    if (params.direction === 'deposit') {
      if (params.type === 'approve') {
        const transaction = await approveForDeposit(
          maticPOSClient,
          params.assetId,
          params.amount,
          params.signer
        );
        return response.success(200, {}, { transaction });
      }

      if (params.type === 'status') {
        if (!params.txHash) {
          return response.error(400, {}, new Error('txHash is required to check status'));
        }
        const status = await checkDepositStatus(
          process.env.PARENT_PROVIDER,
          process.env.MATIC_PROVIDER,
          params.txHash
        );
        return response.success(200, {}, { status });
      }

      if (params.type === 'rebalance') {
        const transaction = await deposit(
          maticPOSClient,
          params.assetId,
          params.amount,
          params.signer
        );
        return response.success(200, {}, { transaction });
      }
      return response.error(400, {}, new Error('Unknown type argument'));
    }
  } catch (e) {
    return response.error(500, {}, e);
  }
};
