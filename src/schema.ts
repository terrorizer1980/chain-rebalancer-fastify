import {
  TIntegerString,
  TAddress,
  TBytes32,
  TChainId,
} from "@connext/vector-types";
import { Type, Static } from "@sinclair/typebox";

export const ApproveParamsSchema = Type.Object({
  amount: TIntegerString,
  assetId: TAddress,
  signer: TAddress,
  txHash: Type.Optional(TBytes32),
  fromProvider: Type.String({ format: "uri" }),
  toProvider: Type.String({ format: "uri" }),
  fromChainId: TChainId,
  toChainId: TChainId,
});
export type ApproveParams = Static<typeof ApproveParamsSchema>;

export const ApproveResponseSchema = Type.Object({
  allowance: Type.String(),
  transaction: Type.Optional(
    Type.Object({
      to: Type.String(),
      data: Type.String(),
    })
  ),
});
export type ApproveResponse = Static<typeof ApproveResponseSchema>;

export const ExecuteParamsSchema = ApproveParamsSchema;
export type ExecuteParams = Static<typeof ExecuteParamsSchema>;

export const ExecuteResponseSchema = Type.Object({
  transaction: Type.Optional(
    Type.Object({
      to: Type.String(),
      data: Type.String(),
    })
  ),
});
export type ExecuteResponse = Static<typeof ExecuteResponseSchema>;

export const CheckStatusParamsSchema = Type.Object({
  txHash: TBytes32,
  fromProvider: Type.String({ format: "uri" }),
  toProvider: Type.String({ format: "uri" }),
  fromChainId: TChainId,
  toChainId: TChainId,
  signer: TAddress,
  blockNumber: Type.Number(),
});
export type CheckStatusParams = Static<typeof CheckStatusParamsSchema>;

export const CheckStatusResponseSchema = Type.Object({
  status: Type.Object({ completed: Type.Boolean() }),
  transaction: Type.Optional(
    Type.Object({
      to: Type.String(),
      data: Type.String(),
    })
  ),
});
export type CheckStatusResponse = Static<typeof CheckStatusResponseSchema>;
