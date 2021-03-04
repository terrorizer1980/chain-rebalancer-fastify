import { MaticPOSClient } from "@maticnetwork/maticjs";
import { RestClient } from "typed-rest-client";

export const burn = async (
  maticPOSClient: MaticPOSClient,
  assetId: string,
  amountToBridge: string,
  routerAddress: string
): Promise<{ transaction: string }> => {
  console.log(
    `burn: ${JSON.stringify({ assetId, amountToBridge, routerAddress })}`
  );
  const burn = await maticPOSClient.burnERC20(assetId, amountToBridge, {
    from: routerAddress,
    encodeAbi: true,
  });
  console.log("burn: ", burn);
  return { transaction: burn };
};

type BlockIncludedResponse = {
  message: string;
  // success
  headerBlockNumber?: string;
  blockNumber?: string;
  start?: string;
  end?: string;
  proposer?: string;
  root?: string;
  createdAt?: string;
  // failure
  error: boolean;
};

export const waitForProofOfBurn = async (
  maticPOSClient: MaticPOSClient,
  childChainId: number,
  blockNumber: number,
  burnTxHash: string,
  callbackUrl: string,
  routerAddress: string
) => {
  let url: string;
  if (childChainId === 80001) {
    url = `https://apis.matic.network/api/v1/mumbai/block-included/${blockNumber}`;
  } else if (childChainId === 137) {
    url = `https://apis.matic.network/api/v1/matic/block-included/${blockNumber}`;
  } else {
    throw new Error(`ChainId not supported: ${childChainId}`);
  }
  const rest = new RestClient("rebalancer");

  console.log("Waiting for proof of burn");
  let counter = 0;
  const interval = setInterval(async () => {
    console.log("Interval started: ", counter);
    const res = await rest.get<BlockIncludedResponse>(url);
    if (res.statusCode !== 200) {
      console.error(`Bad response from Matic API: ${res}`);
      return;
    }
    console.log("res: ", res);
    if (res.result.message.toLowerCase().includes("No Block found")) {
      console.log("Block not present yet");
      return;
    }

    if (res.result.message.toLowerCase().includes("success")) {
      console.log("Block is included, sending tx to webhook: ", callbackUrl);
      const tx = await maticPOSClient.exitERC20(burnTxHash, {
        from: routerAddress,
        encodeAbi: true,
      });
      const callbackRes = await rest.create(callbackUrl, { transaction: tx });
      console.log("callbackRes: ", callbackRes);
      clearInterval(interval);
    }
  }, 30_000);
};
