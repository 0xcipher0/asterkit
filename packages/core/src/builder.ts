import type { Hex, WalletClient } from "viem";
import {
  DEFAULT_ASTER_CHAIN,
  DEFAULT_HOST,
  DEFAULT_SIGNATURE_CHAIN_ID,
} from "./config";
import { AsterRequestError } from "./agent";
import { buildQueryString, getNonce, signEIP712Main } from "./utils";

export type ApproveBuilderParams = {
  builder: string;
  maxFeeRate: string;
  builderName: string;
  asterChain: string;
  user: string;
  nonce: number;
};

export type SignedApproveBuilderParams = ApproveBuilderParams & {
  signature: Hex;
  signatureChainId: number;
};

export type ApproveBuilderOptions = {
  walletClient: WalletClient;
  host?: string;
  signatureChainId?: number;
  builder: string;
  maxFeeRate: string;
  builderName: string;
  asterChain?: string;
  nonce?: number;
};

export type ApproveBuilderResult<T = unknown> = {
  status: number;
  data: T;
  url: string;
  params: SignedApproveBuilderParams;
};

export async function approveBuilder<T = unknown>({
  walletClient,
  host,
  signatureChainId,
  builder,
  maxFeeRate,
  builderName,
  asterChain,
  nonce,
}: ApproveBuilderOptions): Promise<ApproveBuilderResult<T>> {
  const walletUser = walletClient.account?.address;
  if (!walletUser) {
    throw new Error(
      "walletClient.account is required. Create walletClient with an account."
    );
  }

  const params: ApproveBuilderParams = {
    builder,
    maxFeeRate,
    builderName,
    asterChain: asterChain ?? DEFAULT_ASTER_CHAIN,
    user: walletUser,
    nonce: nonce ?? getNonce(),
  };

  const signature = await signEIP712Main({
    walletClient,
    params,
    primaryType: "ApproveBuilder",
  });

  const signedParams: SignedApproveBuilderParams = {
    ...params,
    signature,
    signatureChainId: signatureChainId ?? DEFAULT_SIGNATURE_CHAIN_ID,
  };

  const queryString = buildQueryString(signedParams);
  const url = `${host ?? DEFAULT_HOST}/fapi/v3/approveBuilder?${queryString}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "AsterKit/1.0",
    },
    body: "",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new AsterRequestError(response.status, url, data);
  }

  return {
    status: response.status,
    data: data as T,
    url,
    params: signedParams,
  };
}
