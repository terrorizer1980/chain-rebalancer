import { APIGatewayProxyEvent } from 'aws-lambda';

import handler from '../handler';

import MaticSDK from '@maticnetwork/maticjs';
import * as rebalance from '../rebalance';

jest.mock('@maticnetwork/maticjs');
jest.mock('../rebalance');

let mockEvent: APIGatewayProxyEvent;

beforeEach(() => {
  /** Create a mock event body */
  mockEvent = ({
    body: JSON.stringify({
      amount: `100`,
      assetId: '0xbd69fC70FA1c3AED524Bb4E82Adc5fcCFFcD79Fa',
      direction: `deposit`,
      routerAddress: `vector7tbbTxQp8ppEQUgPsbGiTrVdapLdU5dH7zTbVuXRf1M4CEBU9Q`,
    }),
  } as unknown) as APIGatewayProxyEvent;
  (MaticSDK as any).mockClear();
});

test(`Should return hello world response`, async (done) => {
  const expectedResponse = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ error: {}, data: { message: 'Hello World!' } }),
  };

  const result = await handler(mockEvent);

  expect(MaticSDK.MaticPOSClient).toHaveBeenCalledWith({
    maticProvider: undefined,
    network: 'testnet',
    parentProvider: undefined,
    version: 'mumbai',
  });

  expect(result).toEqual(expectedResponse);
  done();
});
