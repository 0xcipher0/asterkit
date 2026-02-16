import type {
  Account,
  Hex,
  TypedDataParameter,
  WalletClient,
  SignTypedDataParameters,
} from "viem";
import { EIP712_DOMAIN_MAIN, EIP712_DOMAIN_MESSAGE } from "./config";

let lastSecond = 0;
let nonceCounter = 0;

export function getNonce(): number {
  const nowSecond = Math.floor(Date.now() / 1000);

  if (nowSecond === lastSecond) {
    nonceCounter += 1;
  } else {
    lastSecond = nowSecond;
    nonceCounter = 0;
  }

  return nowSecond * 1_000_000 + nonceCounter;
}

export function buildQueryString(params: Record<string, unknown>): string {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .map((key) => `${key}=${String(params[key])}`)
    .join("&");
}

export function capitalizeKeys<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
    result[capitalizedKey] = value;
  }

  return result;
}

function inferMessageFieldType(value: unknown): "bool" | "uint256" | "string" {
  if (typeof value === "boolean") return "bool";
  if (typeof value === "bigint") return "uint256";
  if (typeof value === "number" && Number.isInteger(value)) return "uint256";
  return "string";
}

function resolveSignerAccount(walletClient: WalletClient): Account {
  const selected = walletClient.account;
  if (selected === undefined) {
    throw new Error(
      "walletClient.account is required. Create walletClient with an account."
    );
  }
  return selected;
}

type SignMainParams = {
  walletClient: WalletClient;
  params: Record<string, unknown>;
  primaryType: string;
};

export async function signEIP712Main({
  walletClient,
  params,
  primaryType,
}: SignMainParams): Promise<Hex> {
  const signerAccount = resolveSignerAccount(walletClient);
  const capitalizedParams = capitalizeKeys(params);

  const messageType: readonly TypedDataParameter[] = Object.entries(
    capitalizedParams
  ).map(([name, value]) => ({
    name,
    type: inferMessageFieldType(value),
  }));

  const types: Record<string, readonly TypedDataParameter[]> = {
    [primaryType]: messageType,
  };

  const typedDataParams: SignTypedDataParameters<
    Record<string, readonly TypedDataParameter[]>,
    string
  > = {
    account: signerAccount,
    domain: EIP712_DOMAIN_MAIN,
    primaryType,
    types,
    message: capitalizedParams,
  };

  return walletClient.signTypedData(typedDataParams);
}

type SignMessageParams = {
  walletClient: WalletClient;
  message: string;
};

export async function signEIP712Message({
  walletClient,
  message,
}: SignMessageParams): Promise<Hex> {
  const signerAccount = resolveSignerAccount(walletClient);

  return walletClient.signTypedData({
    account: signerAccount,
    domain: EIP712_DOMAIN_MESSAGE,
    primaryType: "Message",
    types: {
      Message: [{ name: "msg", type: "string" }],
    },
    message: {
      msg: message,
    },
  });
}
