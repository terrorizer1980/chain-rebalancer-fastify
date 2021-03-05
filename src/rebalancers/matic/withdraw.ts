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
  // check that there is sufficient funds on signer
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

export const checkForProofOfBurn = async (
  maticPOSClient: MaticPOSClient,
  childChainId: number,
  blockNumber: number,
  burnTxHash: string,
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

  const res = await rest.get<BlockIncludedResponse>(url);
  if (res.statusCode !== 200) {
    console.error(
      `Bad response from Matic API: [${res.statusCode}] ${JSON.stringify(
        res.result
      )}`
    );
    return;
  }
  console.log("res: ", res);
  if (res.result.message.toLowerCase().includes("No Block found")) {
    console.log("Block not present yet");
    return { completed: false };
  }

  if (res.result.message.toLowerCase().includes("success")) {
    console.log("Block is included, generating exit tx");
    const tx = await maticPOSClient.exitERC20(burnTxHash, {
      from: routerAddress,
      encodeAbi: true,
    });
    return { completed: true, transaction: tx };
  }

  console.error("Unknown response, check logs and handle!");
  return { completed: false };
};
