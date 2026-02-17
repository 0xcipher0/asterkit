import { describe, expect, it } from "bun:test";
import { createWalletClient, http, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { approveBuilder } from "./builder";

const hasMainKey = Boolean(process.env.MAIN_PRIVATE_KEY);
const shouldRun = hasMainKey;
const testIntegration = shouldRun ? it : it.skip;
const testMissingKey = hasMainKey ? it.skip : it;

describe("builder integration", () => {
  testIntegration("approveBuilder calls real /fapi/v3/approveBuilder", async () => {
    const mainPrivateKey = process.env.MAIN_PRIVATE_KEY as Hex;
    const mainAccount = privateKeyToAccount(mainPrivateKey);
    const mainWalletClient = createWalletClient({
      account: mainAccount,
      transport: http("https://bsc-dataseed.binance.org"),
    });

    const builderAddress = '0xb21079E9C5ef6fE9fFf626Ba227F57b1b2eC1607'

    const result = await approveBuilder({
      walletClient: mainWalletClient,
      builder: builderAddress,
      maxFeeRate: "0.00001",
      builderName: `AsterKit`,
    });

    expect(result.status).toBeGreaterThanOrEqual(200);
    expect(result.status).toBeLessThan(300);
    expect(result.params.signature.startsWith("0x")).toBe(true);
  });

  testMissingKey("is skipped when MAIN_PRIVATE_KEY is missing", () => {
    expect(hasMainKey).toBe(false);
  });
});
