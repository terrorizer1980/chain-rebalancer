import { MaticPOSClient } from '@maticnetwork/maticjs';

import { BigNumber } from '@ethersproject/bignumber';
import { MaxUint256 } from '@ethersproject/constants';
import { Contract } from '@ethersproject/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';

export const deposit = async (
  maticPOSClient: MaticPOSClient,
  assetId: string,
  amountToBridge: string,
  routerAddress: string
): Promise<{ transaction: string }> => {
  console.log(`deposit: ${JSON.stringify({ assetId, amountToBridge, routerAddress })}`);
  const deposit = await maticPOSClient.depositERC20ForUser(assetId, routerAddress, amountToBridge, {
    from: routerAddress,
    encodeAbi: true,
  });
  console.log('deposit: ', deposit);
  return { transaction: deposit };
};

export const approveForDeposit = async (
  maticPOSClient: MaticPOSClient,
  assetId: string,
  amountToBridge: string,
  routerAddress: string
): Promise<any> => {
  console.log(`approveForDeposit: ${JSON.stringify({ assetId, amountToBridge, routerAddress })}`);
  const allowance = await maticPOSClient.getERC20Allowance(routerAddress, assetId, {
    from: routerAddress,
  });
  console.log(`allowance for ${assetId}: ${allowance}, needed: ${amountToBridge}`);
  if (BigNumber.from(allowance).lt(amountToBridge)) {
    console.log(`Allowance is not sufficient, generating max approve tx`);
    const approveTx = await maticPOSClient.approveERC20ForDeposit(assetId, MaxUint256.toString(), {
      from: routerAddress,
      encodeAbi: true,
    });
    console.log('approveTx: ', approveTx);
    return { transaction: approveTx };
  } else {
    console.log(`Allowance is sufficient`);
    return { allowance };
  }
};

export const checkDepositStatus = async (
  parentProvider: string,
  childProvider: string,
  parentChainId: number,
  childChainId: number,
  txHash: string
): Promise<any> => {
  console.log(`checkDepositStatus: ${JSON.stringify({ parentProvider, childProvider, txHash })}`);
  const parentEthProvider = new JsonRpcProvider(parentProvider);
  console.log('parentEthProvider: ', parentEthProvider);
  const childEthProvider = new JsonRpcProvider(childProvider);
  console.log('childEthProvider: ', childEthProvider);
  const childContract = new Contract(
    '0x0000000000000000000000000000000000001001',
    [
      {
        constant: true,
        inputs: [],
        name: 'lastStateId',
        outputs: [
          {
            name: '',
            type: 'uint256',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
    childEthProvider
  );

  let tx = await parentEthProvider.getTransactionReceipt(txHash);
  console.log('tx: ', tx);
  let childCounter = await childContract.lastStateId();
  console.log('childCounter: ', childCounter);
  let rootCounter = BigNumber.from(tx.logs[3].topics[1]);
  console.log('rootCounter: ', rootCounter);
  return {
    completed: BigNumber.from(childCounter).gte(rootCounter),
    childCounter: BigNumber.from(childCounter).toString(),
    rootCounter: rootCounter.toString(),
  };
};
