// export const depositToMatic = async (): Promise<[string, string]> => {
//   const approve = await maticPOSClient.approveERC20ForDeposit(assetId, amountToBridge, {
//     from: routerAddress,
//     encodeAbi: true,
//   });
//   const deposit = await maticPOSClient.depositERC20ForUser(assetId, routerAddress, amountToBridge, {
//     from: routerAddress,
//     encodeAbi: true,
//   });
//   return [approve, deposit];
// };
