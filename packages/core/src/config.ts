import type { TypedDataDomain } from "viem";

export const DEFAULT_HOST = "https://fapi.asterdex.com";
export const DEFAULT_SIGNATURE_CHAIN_ID = 56;
export const DEFAULT_AGENT_NAME = "2dkkd0001";
export const DEFAULT_ASTER_CHAIN = "Mainnet";

export const EIP712_DOMAIN_MAIN: TypedDataDomain = {
  name: "AsterSignTransaction",
  version: "1",
  chainId: 56,
  verifyingContract: "0x0000000000000000000000000000000000000000",
};

export const EIP712_DOMAIN_MESSAGE: TypedDataDomain = {
  name: "AsterSignTransaction",
  version: "1",
  chainId: 1666,
  verifyingContract: "0x0000000000000000000000000000000000000000",
};
