import { TIntegerString, TAddress, TBytes32 } from "@connext/vector-types";
import { MaticPOSClient } from "@maticnetwork/maticjs";
import { Type, Static } from "@sinclair/typebox";
import fastify from "fastify";
import {
  approveForDeposit,
  checkDepositStatus,
  deposit,
} from "./rebalancers/matic";

const server = fastify();

export const RebalanceParamsSchema = Type.Object({
  amount: TIntegerString,
  assetId: TAddress,
  signer: TAddress,
  txHash: Type.Optional(TBytes32),
  fromProvider: Type.String({ format: "uri" }),
  toProvider: Type.String({ format: "uri" }),
  fromChainId: Type.Number(),
  toChainId: Type.Number(),
});
export type RebalanceParams = Static<typeof RebalanceParamsSchema>;

server.get("/ping", async (request, reply) => {
  return "pong\n";
});

server.post<{ Body: RebalanceParams }>(
  "/matic/deposit/approval",
  { schema: { body: RebalanceParamsSchema } },
  async (request, reply) => {
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
      return reply.code(500).send({ error: "Internal server error" });
    }
  }
);

server.post<{ Body: RebalanceParams }>(
  "/matic/deposit/execute",
  { schema: { body: RebalanceParamsSchema } },
  async (request, reply) => {
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

server.post<{ Body: RebalanceParams }>(
  "/matic/deposit/status",
  { schema: { body: RebalanceParamsSchema } },
  async (request, reply) => {
    if (!request.body.txHash) {
      return reply
        .code(400)
        .send({ error: "txHash is required to check status" });
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
      return reply.code(500).send({ error: "Internal server error" });
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
