import { MaticPOSClient } from '@maticnetwork/maticjs';
import { BigNumber, constants, Contract, providers, utils } from 'ethers';

export const deposit = async (
  maticPOSClient: MaticPOSClient,
  assetId: string,
  amountToBridge: string,
  routerAddress: string
): Promise<{ depositTx: string }> => {
  console.log(`deposit: ${JSON.stringify({ assetId, amountToBridge, routerAddress })}`);
  const deposit = await maticPOSClient.depositERC20ForUser(assetId, routerAddress, amountToBridge, {
    from: routerAddress,
    encodeAbi: true,
  });
  console.log('deposit: ', deposit);
  return { depositTx: deposit };
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
    const approveTx = await maticPOSClient.approveERC20ForDeposit(
      assetId,
      constants.MaxUint256.toString(),
      {
        from: routerAddress,
        encodeAbi: true,
      }
    );
    console.log('approveTx: ', approveTx);
    return approveTx;
  } else {
    console.log(`Allowance is sufficient`);
    return undefined;
  }
};

export const checkDepositStatus = async (
  parentProvider: string,
  childProvider: string,
  txHash: string
): Promise<any> => {
  console.log(`checkDepositStatus: ${JSON.stringify({ parentProvider, childProvider, txHash })}`);
  const parentEthProvider = new providers.JsonRpcProvider(parentProvider);
  const childEthProvider = new providers.JsonRpcProvider(childProvider);
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
  let childCounter = await childContract.lastStateId();
  console.log('childCounter: ', childCounter);
  let rootCounter = BigNumber.from(tx.logs[3].topics[1]);
  console.log('rootCounter: ', rootCounter);
  return BigNumber.from(childCounter).gte(rootCounter);
};
