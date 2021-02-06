import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MaticPOSClient } from "@maticnetwork/maticjs";
import { ChannelSigner } from "@connext/vector-utils";
import {
  BigNumber,
  constants,
  Contract,
  providers,
  utils,
  Wallet,
} from "ethers";
import { ERC20Abi } from "@connext/vector-types";

type RebalanceConfig = {
  maticAssetId: string;
  maticAssetIdDecimals: string;
  ethAssetId: string;
  ethAssetIdDecimals: string;
  targetRatio: number;
  allowedDeviationPct: number;
}[];

const ETH_CHAIN_ID = 1;
const MATIC_CHAIN_ID = 137;

const getOnchainBalanceForAsset = async (
  assetId: string,
  balanceOf: string,
  provider: providers.JsonRpcProvider
): Promise<BigNumber> => {
  if (assetId === constants.AddressZero) {
    return provider.getBalance(balanceOf);
  } else {
    return new Contract(assetId, ERC20Abi, provider).balanceOf(balanceOf);
  }
};

export const rebalanceHandler = async (): Promise<APIGatewayProxyResult> => {
  const chainProviders = JSON.parse(process.env.CHAIN_PROVIDERS);
  const rebalanceConfig: RebalanceConfig = JSON.parse(
    process.env.REBALANCE_CONFIG
  );

  const pk = JSON.parse(process.env.ROUTER_KEY);
  const routerSigner = new ChannelSigner(pk);
  console.log("routerSigner.publicIdentifier: ", routerSigner.publicIdentifier);
  console.log("routerSigner.address: ", routerSigner.address);
  console.log("chainProviders: ", chainProviders);

  const parentProvider = chainProviders[ETH_CHAIN_ID];
  const maticProvider = chainProviders[MATIC_CHAIN_ID];

  const parentEthProvider = new providers.JsonRpcProvider(parentProvider);
  const maticEthProvider = new providers.JsonRpcProvider(parentProvider);

  const parentWallet = new Wallet(pk).connect(parentEthProvider);
  const maticWallet = new Wallet(pk).connect(maticEthProvider);

  const maticPOSClient = new MaticPOSClient({
    network: "mainnet",
    version: "v1",
    parentProvider,
    maticProvider,
  });

  // check router signer address balances against ratios
  for (const rebalance of rebalanceConfig) {
    const parentBalance = await getOnchainBalanceForAsset(
      rebalance.ethAssetId,
      routerSigner.address,
      parentEthProvider
    );

    const maticBalance = await getOnchainBalanceForAsset(
      rebalance.maticAssetId,
      routerSigner.address,
      maticEthProvider
    );

    let ratio: BigNumber;
    if (parentBalance.gt(maticBalance)) {
      ratio = parentBalance.div(maticBalance);
    } else {
      ratio = maticBalance.div(parentBalance);
    }
    console.log("ratio: ", ratio);

    const difference = ratio.sub(utils.parseEther("1"));
    console.log("difference: ", difference);

    const discrepancy = parseFloat(utils.formatEther(difference));
    console.log("discrepancy: ", discrepancy);
  }

  // rebalance between matic/mainnet as necessary

  // https://docs.matic.network/docs/develop/ethereum-matic/pos/using-sdk/erc20

  return {
    statusCode: 200,
    body: JSON.stringify({ matic: maticPOSClient.network }),
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  };
};
