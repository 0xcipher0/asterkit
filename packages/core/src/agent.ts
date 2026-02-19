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
  signEIP712Message,
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

export type UpdateAgentParams = {
  agentAddress: string;
  ipWhitelist?: string;
  canSpotTrade: boolean;
  canPerpTrade: boolean;
  canWithdraw: boolean;
  asterChain: string;
  user: string;
  nonce: number;
};

export type SignedUpdateAgentParams = UpdateAgentParams & {
  signature: Hex;
  signatureChainId: number;
};

export type UpdateAgentOptions = {
  walletClient: WalletClient;
  host?: string;
  signatureChainId?: number;
  agentAddress: string;
  ipWhitelist?: string;
  canSpotTrade: boolean;
  canPerpTrade: boolean;
  canWithdraw: boolean;
  asterChain?: string;
  nonce?: number;
};

export type UpdateAgentResult<T = unknown> = {
  status: number;
  data: T;
  url: string;
  params: SignedUpdateAgentParams;
};

export type DeleteAgentParams = {
  agentAddress: string;
  asterChain: string;
  user: string;
  nonce: number;
};

export type SignedDeleteAgentParams = DeleteAgentParams & {
  signature: Hex;
  signatureChainId: number;
};

export type DeleteAgentOptions = {
  walletClient: WalletClient;
  host?: string;
  signatureChainId?: number;
  agentAddress: string;
  asterChain?: string;
  nonce?: number;
};

export type DeleteAgentResult<T = unknown> = {
  status: number;
  data: T;
  url: string;
  params: SignedDeleteAgentParams;
};

export type GetAgentsParams = {
  asterChain: string;
  user: string;
  signer: string;
  nonce: number;
};

export type GetAgentsOptions = {
  walletClient?: WalletClient;
  host?: string;
  asterChain?: string;
  user: string;
  signer: string;
  nonce?: number;
  signature?: Hex;
};

export type SignedGetAgentsParams = GetAgentsParams & {
  signature: Hex;
};

export type GetAgentsResult<T = unknown> = {
  status: number;
  data: T;
  url: string;
  params: SignedGetAgentsParams;
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
  const normalizedIpWhitelist = ipWhitelist?.trim();
  if (normalizedIpWhitelist) {
    params.ipWhitelist = normalizedIpWhitelist;
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

export async function getAgents<T = unknown>({
  walletClient,
  host,
  asterChain,
  user,
  signer,
  nonce,
  signature,
}: GetAgentsOptions): Promise<GetAgentsResult<T>> {
  const params: GetAgentsParams = {
    asterChain: asterChain ?? DEFAULT_ASTER_CHAIN,
    user,
    signer,
    nonce: nonce ?? getNonce(),
  };

  const queryString = buildQueryString(params);
  let finalSignature = signature;
  if (!finalSignature) {
    if (!walletClient) {
      throw new Error(
        "getAgents requires either signature or walletClient to sign the query."
      );
    }
    if (!walletClient.account?.address) {
      throw new Error(
        "walletClient.account is required. Create walletClient with an account."
      );
    }
    if (walletClient.account.address.toLowerCase() !== signer.toLowerCase()) {
      throw new Error("signer must match walletClient.account.address.");
    }
    finalSignature = await signEIP712Message({
      walletClient,
      message: queryString,
    });
  }

  const url = `${host ?? DEFAULT_HOST}/fapi/v3/agent?${queryString}&signature=${finalSignature}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "AsterKit/1.0",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new AsterRequestError(response.status, url, data);
  }

  return {
    status: response.status,
    data: data as T,
    url,
    params: {
      ...params,
      signature: finalSignature,
    },
  };
}

export async function updateAgent<T = unknown>({
  walletClient,
  host,
  signatureChainId,
  agentAddress,
  ipWhitelist,
  canSpotTrade,
  canPerpTrade,
  canWithdraw,
  asterChain,
  nonce,
}: UpdateAgentOptions): Promise<UpdateAgentResult<T>> {
  const walletUser = walletClient.account?.address;
  if (!walletUser) {
    throw new Error(
      "walletClient.account is required. Create walletClient with an account."
    );
  }

  const params: UpdateAgentParams = {
    agentAddress,
    canSpotTrade,
    canPerpTrade,
    canWithdraw,
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
    primaryType: "UpdateAgent",
  });

  const signedParams: SignedUpdateAgentParams = {
    ...params,
    signature,
    signatureChainId: signatureChainId ?? DEFAULT_SIGNATURE_CHAIN_ID,
  };

  const queryString = buildQueryString(signedParams);
  const url = `${host ?? DEFAULT_HOST}/fapi/v3/updateAgent?${queryString}`;
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

export async function deleteAgent<T = unknown>({
  walletClient,
  host,
  signatureChainId,
  agentAddress,
  asterChain,
  nonce,
}: DeleteAgentOptions): Promise<DeleteAgentResult<T>> {
  const walletUser = walletClient.account?.address;
  if (!walletUser) {
    throw new Error(
      "walletClient.account is required. Create walletClient with an account."
    );
  }

  const params: DeleteAgentParams = {
    agentAddress,
    asterChain: asterChain ?? DEFAULT_ASTER_CHAIN,
    user: walletUser,
    nonce: nonce ?? getNonce(),
  };

  const signature = await signEIP712Main({
    walletClient,
    params,
    primaryType: "DelAgent",
  });

  const signedParams: SignedDeleteAgentParams = {
    ...params,
    signature,
    signatureChainId: signatureChainId ?? DEFAULT_SIGNATURE_CHAIN_ID,
  };

  const queryString = buildQueryString(signedParams);
  const url = `${host ?? DEFAULT_HOST}/fapi/v3/agent?${queryString}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "AsterKit/1.0",
    },
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
