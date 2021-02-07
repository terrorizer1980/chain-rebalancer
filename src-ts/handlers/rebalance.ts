import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MaticPOSClient } from "@maticnetwork/maticjs";
import { calculateExchangeAmount, ChannelSigner } from "@connext/vector-utils";
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

const chainProviders = JSON.parse(process.env.CHAIN_PROVIDERS);
const rebalanceConfig: RebalanceConfig = JSON.parse(
  process.env.REBALANCE_CONFIG
);

const pk = JSON.parse(process.env.ROUTER_KEY);
const routerSigner = new ChannelSigner(pk);

export const getOnchainBalanceForAsset = async (
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

export const bridgeToMatic = async (
  amountToBridge: BigNumber,
  assetId: string,
  maticPOSClient: MaticPOSClient
): Promise<{ txHash: string }> => {
  await maticPOSClient.approveERC20ForDeposit(assetId, amountToBridge, {
    from: routerSigner.address,
  });
  await maticPOSClient.depositERC20ForUser(
    assetId,
    routerSigner.address,
    amountToBridge,
    {
      from: routerSigner.address,
      gasPrice: "10000000000",
    }
  );
  return { txHash: "" };
};

export const bridgeToEth = async (
  amountToBridge: BigNumber,
  assetId: string,
  maticPOSClient: MaticPOSClient
): Promise<{ txHash: string }> => {
  return { txHash: "" };
};

const HDWalletProvider = require("@truffle/hdwallet-provider");

export const rebalanceHandler = async (): Promise<APIGatewayProxyResult> => {
  console.log("routerSigner.publicIdentifier: ", routerSigner.publicIdentifier);
  console.log("routerSigner.address: ", routerSigner.address);
  console.log("chainProviders: ", chainProviders);

  const parentProvider = chainProviders[ETH_CHAIN_ID];
  const maticProvider = chainProviders[MATIC_CHAIN_ID];

  const parentWallet = new HDWalletProvider(pk, parentProvider);
  const maticWallet = new HDWalletProvider(pk, maticProvider);

  const parentEthProvider = new providers.JsonRpcProvider(parentProvider);
  const maticEthProvider = new providers.JsonRpcProvider(parentProvider);

  const maticPOSClient = new MaticPOSClient({
    network: "mainnet",
    version: "v1",
    parentWallet,
    maticWallet,
  });

  // check router signer address balances against ratios
  for (const rebalance of rebalanceConfig) {
    const parentBalance = await getOnchainBalanceForAsset(
      rebalance.ethAssetId,
      routerSigner.address,
      parentEthProvider
    );
    console.log("parentBalance: ", parentBalance.toString());

    const maticBalance = await getOnchainBalanceForAsset(
      rebalance.maticAssetId,
      routerSigner.address,
      maticEthProvider
    );
    console.log("maticBalance: ", maticBalance.toString());

    let ratio: number;
    if (parentBalance.gt(maticBalance)) {
      ratio =
        parseFloat(utils.formatEther(parentBalance)) /
        parseFloat(utils.formatEther(maticBalance));
    } else {
      ratio =
        parseFloat(utils.formatEther(parentBalance)) /
        parseFloat(utils.formatEther(maticBalance));
    }
    console.log("ratio: ", ratio);

    const difference = ratio - 1;
    console.log("difference: ", difference);
    const discrepancyPct = difference * 100;

    if (discrepancyPct > rebalance.allowedDeviationPct) {
      const total = parentBalance.add(maticBalance);
      console.log("total: ", total.toString());
      const target = total.div(2);
      console.log("target: ", target.toString());
      let res;
      if (parentBalance.gt(maticBalance)) {
        const amountToBridge = parentBalance.sub(target);
        console.log("amountToBridge: ", amountToBridge.toString());
        res = await bridgeToMatic(amountToBridge, rebalance.ethAssetId);
      } else {
        const amountToBridge = maticBalance.sub(target);
        console.log("amountToBridge: ", amountToBridge.toString());
        res = await bridgeToEth(amountToBridge, rebalance.ethAssetId);
      }
    }
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
