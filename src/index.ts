import { ERC20Abi } from "@connext/vector-types";
import { MaticPOSClient } from "@maticnetwork/maticjs";
import { constants, Contract, providers } from "ethers";
import fastify from "fastify";
import {
  approveForDeposit,
  checkDepositStatus,
  deposit,
} from "./rebalancers/matic/deposit";
import { burn, checkForProofOfBurn } from "./rebalancers/matic/withdraw";
import {
  ApproveParams,
  ApproveParamsSchema,
  ApproveResponseSchema,
  CheckStatusParams,
  CheckStatusParamsSchema,
  ExecuteParams,
  ExecuteParamsSchema,
} from "./schema";

const server = fastify();

server.get("/ping", async (request, reply) => {
  return "pong\n";
});

server.post<{ Body: ApproveParams }>(
  "/matic/deposit/approval",
  { schema: { body: ApproveParamsSchema, response: ApproveResponseSchema } },
  async (request, reply) => {
    if (![1, 5].includes(request.body.fromChainId)) {
      return reply
        .code(400)
        .send({ error: "fromChainId not supported", body: request.body });
    }

    if (![137, 80001].includes(request.body.toChainId)) {
      return reply
        .code(400)
        .send({ error: "toChainId not supported", body: request.body });
    }

    // native asset doesnt need approval
    if (request.body.assetId === constants.AddressZero) {
      return reply
        .code(200)
        .send({ allowance: constants.MaxUint256.toString() });
    }

    const network = request.body.fromChainId === 1 ? "mainnet" : "testnet";
    const version = request.body.fromChainId === 1 ? "v1" : "mumbai";
    console.log("network: ", network);
    console.log("version: ", version);
    try {
      const maticPOSClient = new MaticPOSClient({
        network,
        version,
        parentProvider: request.body.fromProvider,
        maticProvider: request.body.toProvider,
      });

      const { transaction, allowance } = await approveForDeposit(
        maticPOSClient,
        request.body.assetId,
        request.body.amount,
        request.body.signer
      );
      return reply.send({ transaction, allowance });
    } catch (e) {
      console.log(e);
      return reply
        .code(500)
        .send({ error: "Internal server error", message: e.message });
    }
  }
);

server.post<{ Body: ExecuteParams }>(
  "/matic/deposit/execute",
  { schema: { body: ExecuteParamsSchema } },
  async (request, reply) => {
    if (![1, 5].includes(request.body.fromChainId)) {
      return reply
        .code(400)
        .send({ error: "fromChainId not supported", body: request.body });
    }

    if (![137, 80001].includes(request.body.toChainId)) {
      return reply
        .code(400)
        .send({ error: "toChainId not supported", body: request.body });
    }

    const network = request.body.fromChainId === 1 ? "mainnet" : "testnet";
    const version = request.body.fromChainId === 1 ? "v1" : "mumbai";
    console.log("network: ", network);
    console.log("version: ", version);

    try {
      const maticPOSClient = new MaticPOSClient({
        network,
        version,
        parentProvider: request.body.fromProvider,
        maticProvider: request.body.toProvider,
      });

      const { transaction } = await deposit(
        maticPOSClient,
        request.body.assetId,
        request.body.amount,
        request.body.signer
      );
      return reply.send({ transaction });
    } catch (e) {
      console.log(e);
      return reply.code(500).send({ error: "Internal server error" });
    }
  }
);

server.post<{ Body: CheckStatusParams }>(
  "/matic/deposit/status",
  { schema: { body: CheckStatusParamsSchema } },
  async (request, reply) => {
    if (![1, 5].includes(request.body.fromChainId)) {
      return reply
        .code(400)
        .send({ error: "fromChainId not supported", body: request.body });
    }

    if (![137, 80001].includes(request.body.toChainId)) {
      return reply
        .code(400)
        .send({ error: "toChainId not supported", body: request.body });
    }

    try {
      const status = await checkDepositStatus(
        request.body.fromProvider,
        request.body.toProvider,
        request.body.fromChainId,
        request.body.toChainId,
        request.body.txHash
      );
      return reply.send({ status });
    } catch (e) {
      console.log(e);
      return reply
        .code(500)
        .send({ error: `Internal server error: ${e.message}` });
    }
  }
);

server.post<{ Body: ApproveParams }>(
  "/matic/withdraw/approval",
  { schema: { body: ApproveParamsSchema, response: ApproveResponseSchema } },
  async (request, reply) => {
    if (![1, 5].includes(request.body.toChainId)) {
      return reply
        .code(400)
        .send({ error: "toChainId not supported", body: request.body });
    }

    if (![137, 80001].includes(request.body.fromChainId)) {
      return reply
        .code(400)
        .send({ error: "fromChainId not supported", body: request.body });
    }
    return reply.send({ transaction: undefined, allowance: "not_needed" });
  }
);

server.post<{ Body: ExecuteParams }>(
  "/matic/withdraw/execute",
  { schema: { body: ExecuteParamsSchema } },
  async (request, reply) => {
    if (![1, 5].includes(request.body.toChainId)) {
      return reply
        .code(400)
        .send({ error: "toChainId not supported", body: request.body });
    }

    if (![137, 80001].includes(request.body.fromChainId)) {
      return reply
        .code(400)
        .send({ error: "fromChainId not supported", body: request.body });
    }

    const network = request.body.toChainId === 1 ? "mainnet" : "testnet";
    const version = request.body.toChainId === 1 ? "v1" : "mumbai";
    console.log("network: ", network);
    console.log("version: ", version);
    console.log("request.body", request.body);

    try {
      // make sure there are sufficient funds to burn
      const maticProvider = new providers.JsonRpcProvider(
        request.body.fromProvider
      );
      const balance =
        request.body.assetId === constants.AddressZero
          ? await maticProvider.getBalance(request.body.signer)
          : await new Contract(
              request.body.assetId,
              ERC20Abi,
              maticProvider
            ).balanceOf(request.body.signer);
      if (balance.lt(request.body.amount)) {
        return reply
          .code(400)
          .send({ error: "Insufficient funds for withdrawal" });
      }

      const maticPOSClient = new MaticPOSClient({
        network,
        version,
        parentProvider: request.body.toProvider,
        maticProvider: request.body.fromProvider,
      });

      const { transaction } = await burn(
        maticPOSClient,
        request.body.assetId,
        request.body.amount,
        request.body.signer
      );
      return reply.send({ transaction });
    } catch (e) {
      console.log(e);
      return reply
        .code(500)
        .send({ error: `Internal server error: ${e.message}` });
    }
  }
);

server.post<{ Body: CheckStatusParams }>(
  "/matic/withdraw/status",
  { schema: { body: CheckStatusParamsSchema } },
  async (request, reply) => {
    if (![1, 5].includes(request.body.toChainId)) {
      return reply
        .code(400)
        .send({ error: "toChainId not supported", body: request.body });
    }

    if (![137, 80001].includes(request.body.fromChainId)) {
      return reply
        .code(400)
        .send({ error: "fromChainId not supported", body: request.body });
    }

    const network = request.body.toChainId === 1 ? "mainnet" : "testnet";
    const version = request.body.toChainId === 1 ? "v1" : "mumbai";
    console.log("network: ", network);
    console.log("version: ", version);

    try {
      // get block number
      const maticProvider = new providers.JsonRpcProvider(
        request.body.fromProvider
      );
      const receipt = await maticProvider.getTransactionReceipt(
        request.body.txHash
      );

      const maticPOSClient = new MaticPOSClient({
        network,
        version,
        parentProvider: request.body.toProvider,
        maticProvider: request.body.fromProvider,
      });
      const status = await checkForProofOfBurn(
        maticPOSClient,
        request.body.fromChainId,
        receipt.blockNumber,
        request.body.txHash,
        request.body.signer
      );
      return reply.send({ status });
    } catch (e) {
      console.log(e);
      return reply
        .code(500)
        .send({ error: `Internal server error: ${e.message}` });
    }
  }
);

server.listen(8080, "0.0.0.0", (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
