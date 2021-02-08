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

utils.defaultAbiCoder.de;

const WebSocket = require("ws");
const Web3 = require("web3");

// For Mumbai
const ws = new WebSocket("wss://ws-mumbai.matic.today/");
// For Matic mainnet: wss://ws-mainnet.matic.network/
const web3 = new Web3();
const abiCoder = web3.eth.abi;

async function checkDepositStatus(
  userAccount,
  rootToken,
  depositAmount,
  childChainManagerProxy
) {
  return new Promise((resolve, reject) => {
    ws.on("open", () => {
      ws.send(
        `{"id": 1, "method": "eth_subscribe", "params": ["newDeposits", {"Contract": ${childChainManagerProxy}}]}`
      );

      ws.on("message", (msg) => {
        const parsedMsg = JSON.parse(msg);
        if (
          parsedMsg &&
          parsedMsg.params &&
          parsedMsg.params.result &&
          parsedMsg.params.result.Data
        ) {
          const fullData = parsedMsg.params.result.Data;
          const { 0: syncType, 1: syncData } = abiCoder.decodeParameters(
            ["bytes32", "bytes"],
            fullData
          );

          // check if sync is of deposit type (keccak256("DEPOSIT"))
          const depositType =
            "0x87a7811f4bfedea3d341ad165680ae306b01aaeacc205d227629cf157dd9f821";
          if (syncType.toLowerCase() === depositType.toLowerCase()) {
            const {
              0: userAddress,
              1: rootTokenAddress,
              2: depositData,
            } = abiCoder.decodeParameters(
              ["address", "address", "bytes"],
              syncData
            );

            // depositData can be further decoded to get amount, tokenId etc. based on token type
            // For ERC20 tokens
            const { 0: amount } = abiCoder.decodeParameters(
              ["uint256"],
              depositData
            );
            if (
              userAddress.toLowerCase() === userAccount.toLowerCase() &&
              rootToken.toLowerCase() === rootTokenAddress.toLowerCase() &&
              depositAmount === amount
            ) {
              resolve(true);
            }
          }
        }
      });

      ws.on("error", () => {
        reject(false);
      });

      ws.on("close", () => {
        reject(false);
      });
    });
  });
}

// Param1 - user address
// Param2 - contract address on main chain
// Param3 - amount deposited on main chain
// Param4 - child chain manager proxy address (0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa for mainnet)
checkDepositStatus(
  "0xFd71Dc9721d9ddCF0480A582927c3dCd42f3064C",
  "0x47195A03fC3Fc2881D084e8Dc03bD19BE8474E46",
  "1000000000000000000",
  "0xb5505a6d998549090530911180f38aC5130101c6"
)
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.log(err);
  });

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
