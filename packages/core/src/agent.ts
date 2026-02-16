import type { Hex, WalletClient } from "viem";
import {
  DEFAULT_AGENT_NAME,
  DEFAULT_ASTER_CHAIN,
  DEFAULT_HOST,
  DEFAULT_SIGNATURE_CHAIN_ID,
} from "./config";
import {
  buildQueryString,
  getNonce,
  signEIP712Main,
} from "./utils";

export type ApproveAgentParams = {
  agentName: string;
  agentAddress: string;
  ipWhitelist?: string;
  expired: number;
  canSpotTrade: boolean;
  canPerpTrade: boolean;
  canWithdraw: boolean;
  asterChain: string;
  user: string;
  nonce: number;
};

export type SignedApproveAgentParams = ApproveAgentParams & {
  signature: Hex;
  signatureChainId: number;
};

export type ApproveAgentOptions = {
  walletClient: WalletClient;
  host?: string;
  signatureChainId?: number;
  agentName?: string;
  agentAddress: string;
  ipWhitelist?: string;
  expired?: number;
  canSpotTrade?: boolean;
  canPerpTrade?: boolean;
  canWithdraw?: boolean;
  asterChain?: string;
  nonce?: number;
};

export type ApproveAgentResult<T = unknown> = {
  status: number;
  data: T;
  url: string;
  params: SignedApproveAgentParams;
};

export class AsterRequestError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly url: string;

  constructor(status: number, url: string, data: unknown) {
    super(`Aster request failed with status ${status}`);
    this.name = "AsterRequestError";
    this.status = status;
    this.url = url;
    this.data = data;
  }
}

export async function approveAgent<T = unknown>({
  walletClient,
  host,
  signatureChainId,
  agentName,
  agentAddress,
  ipWhitelist,
  expired,
  canSpotTrade,
  canPerpTrade,
  canWithdraw,
  asterChain,
  nonce,
}: ApproveAgentOptions): Promise<ApproveAgentResult<T>> {
  const defaultExpired = (() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.getTime();
  })();
  const walletUser = walletClient.account?.address;
  if (!walletUser) {
    throw new Error(
      "walletClient.account is required. Create walletClient with an account."
    );
  }

  const params: ApproveAgentParams = {
    agentName: agentName ?? DEFAULT_AGENT_NAME,
    agentAddress,
    expired: expired ?? defaultExpired,
    canSpotTrade: canSpotTrade ?? true,
    canPerpTrade: canPerpTrade ?? true,
    canWithdraw: canWithdraw ?? false,
    asterChain: asterChain ?? DEFAULT_ASTER_CHAIN,
    user: walletUser,
    nonce: nonce ?? getNonce(),
  };
  if (ipWhitelist !== undefined && ipWhitelist !== null) {
    params.ipWhitelist = ipWhitelist;
  }

  const signature = await signEIP712Main({
    walletClient,
    params,
    primaryType: "ApproveAgent",
  });

  const signedParams: SignedApproveAgentParams = {
    ...params,
    signature,
    signatureChainId: signatureChainId ?? DEFAULT_SIGNATURE_CHAIN_ID,
  };

  const queryString = buildQueryString(signedParams);
  const url = `${host ?? DEFAULT_HOST}/fapi/v3/approveAgent?${queryString}`;

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

export async function getAgent(): Promise<never> {
  throw new Error("getAgent is not implemented yet.");
}

export async function updateAgent(): Promise<never> {
  throw new Error("updateAgent is not implemented yet.");
}

export async function deleteAgent(): Promise<never> {
  throw new Error("deleteAgent is not implemented yet.");
}
