import { describe, expect, it } from "bun:test";
import { createWalletClient, http, type Hex } from "viem";
import {generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { approveAgent } from "./agent";

describe("approveAgent integration", () => {
  it("calls real /fapi/v3/approveAgent", async () => {
    // const privateKey = process.env.MAIN_PRIVATE_KEY as Hex;
    const privateKey = '0x1cd1871e46deb6f930dbdb67a5f019ec8e0e2e32c8649afa047fed1f964defaa'
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      transport: http("https://bsc-dataseed.binance.org"),
    });

    const agentAccount = privateKeyToAccount(generatePrivateKey());

    const result = await approveAgent({
      walletClient,
      agentAddress: agentAccount.address,
    });

    expect(result.status).toBeGreaterThanOrEqual(200);
    expect(result.status).toBeLessThan(300);
    expect(result.params.signature.startsWith("0x")).toBe(true);
  });
});
