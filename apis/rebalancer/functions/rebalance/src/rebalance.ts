import { MaticPOSClient } from '@maticnetwork/maticjs';

export const depositToMatic = async (
  maticPOSClient: MaticPOSClient,
  assetId: string,
  amountToBridge: string,
  routerAddress: string
): Promise<[string, string]> => {
  const approve = await maticPOSClient.approveERC20ForDeposit(assetId, amountToBridge, {
    from: routerAddress,
    encodeAbi: true,
  });
  const deposit = await maticPOSClient.depositERC20ForUser(assetId, routerAddress, amountToBridge, {
    from: routerAddress,
    encodeAbi: true,
  });
  return [approve, deposit];
};
