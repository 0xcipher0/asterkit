import { describe, expect, it } from "bun:test";
import { createWalletClient, http, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { approveAgent, deleteAgent, getAgents, updateAgent } from "./agent";

const hasMainKey = Boolean(process.env.MAIN_PRIVATE_KEY);
const shouldRun = hasMainKey;
const testIntegration = shouldRun ? it : it.skip;
const testMissingKey = hasMainKey ? it.skip : it;
const testAgentPrivateKey = '0x75c795177348fb39b5b2a6776a2e9f684e8c34125ba0f4157038981dc0cba450' as Hex

describe("agent integration", () => {
  testIntegration("approveAgent then getAgents by user", async () => {
    const mainPrivateKey = process.env.MAIN_PRIVATE_KEY as Hex;
    const mainAccount = privateKeyToAccount(mainPrivateKey);
    const mainWalletClient = createWalletClient({
      account: mainAccount,
      transport: http("https://bsc-dataseed.binance.org"),
    });

    const signerPrivateKey = generatePrivateKey();
    const signerAccount = privateKeyToAccount(signerPrivateKey);
    const signerWalletClient = createWalletClient({
      account: signerAccount,
      transport: http("https://bsc-dataseed.binance.org"),
    });

    const approveResult = await approveAgent({
      walletClient: mainWalletClient,
      agentAddress: signerAccount.address,
      agentName: 'AsterKit',
    });

    expect(approveResult.status).toBeGreaterThanOrEqual(200);
    expect(approveResult.status).toBeLessThan(300);
    expect(approveResult.params.signature.startsWith("0x")).toBe(true);

    const agentsResult = await getAgents({
      walletClient: signerWalletClient,
      user: mainAccount.address,
      signer: signerAccount.address,
    });

    expect(agentsResult.status).toBeGreaterThanOrEqual(200);
    expect(agentsResult.status).toBeLessThan(300);
    expect(agentsResult.params.user).toBe(mainAccount.address);
    expect(agentsResult.params.signer).toBe(signerAccount.address);
  });

  testIntegration("getAgents works with pre-authorized signer", async () => {
    const mainPrivateKey = process.env.MAIN_PRIVATE_KEY as Hex;
    const mainAccount = privateKeyToAccount(mainPrivateKey);

    const signerAccount = privateKeyToAccount(testAgentPrivateKey);
    const signerWalletClient = createWalletClient({
      account: signerAccount,
      transport: http("https://bsc-dataseed.binance.org"),
    });

    const agentsResult = await getAgents({
      walletClient: signerWalletClient,
      user: mainAccount.address,
      signer: signerAccount.address,
    });


    expect(agentsResult.status).toBeGreaterThanOrEqual(200);
    expect(agentsResult.status).toBeLessThan(300);
    expect(agentsResult.params.user).toBe(mainAccount.address);
    expect(agentsResult.params.signer).toBe(signerAccount.address);
  });

  testIntegration("updateAgent calls real /fapi/v3/updateAgent", async () => {
    const mainPrivateKey = process.env.MAIN_PRIVATE_KEY as Hex;
    const mainAccount = privateKeyToAccount(mainPrivateKey);
    const mainWalletClient = createWalletClient({
      account: mainAccount,
      transport: http("https://bsc-dataseed.binance.org"),
    });

    const signerPrivateKey = generatePrivateKey();
    const signerAccount = privateKeyToAccount(signerPrivateKey);

    const approveResult = await approveAgent({
      walletClient: mainWalletClient,
      agentAddress: signerAccount.address,
      agentName: "AsterKit",
    });

    expect(approveResult.status).toBeGreaterThanOrEqual(200);
    expect(approveResult.status).toBeLessThan(300);

    const updateResult = await updateAgent({
      walletClient: mainWalletClient,
      agentAddress: signerAccount.address,
      canSpotTrade: false,
      canPerpTrade: true,
      canWithdraw: false,
    });

    expect(updateResult.status).toBeGreaterThanOrEqual(200);
    expect(updateResult.status).toBeLessThan(300);
    expect(updateResult.params.signature.startsWith("0x")).toBe(true);
  });

  testIntegration("deleteAgent calls real /fapi/v3/agent", async () => {
    const mainPrivateKey = process.env.MAIN_PRIVATE_KEY as Hex;
    const mainAccount = privateKeyToAccount(mainPrivateKey);
    const mainWalletClient = createWalletClient({
      account: mainAccount,
      transport: http("https://bsc-dataseed.binance.org"),
    });

    const signerPrivateKey = generatePrivateKey();
    const signerAccount = privateKeyToAccount(signerPrivateKey);

    const approveResult = await approveAgent({
      walletClient: mainWalletClient,
      agentAddress: signerAccount.address,
      agentName: "AsterKit",
    });

    expect(approveResult.status).toBeGreaterThanOrEqual(200);
    expect(approveResult.status).toBeLessThan(300);

    const deleteResult = await deleteAgent({
      walletClient: mainWalletClient,
      agentAddress: signerAccount.address,
    });

    expect(deleteResult.status).toBeGreaterThanOrEqual(200);
    expect(deleteResult.status).toBeLessThan(300);
    expect(deleteResult.params.signature.startsWith("0x")).toBe(true);
  });

  testMissingKey("is skipped when MAIN_PRIVATE_KEY is missing", () => {
    expect(hasMainKey).toBe(false);
  });
});
