import { describe, expect, it } from "bun:test";
import type { WalletClient } from "viem";
import { AsterRequestError } from "./agent";
import { approveBuilder } from "./builder";

function createWalletClientMock(signature: `0x${string}`): WalletClient {
  return {
    account: { address: "0x1111111111111111111111111111111111111111" },
    signTypedData: async () => signature,
  } as unknown as WalletClient;
}

describe("approveBuilder", () => {
  it("signs and posts to /fapi/v3/approveBuilder", async () => {
    const walletClient = createWalletClientMock("0xabc123");
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input, init) => {
      fetchCalls.push({ url: String(input), init });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const result = await approveBuilder({
        walletClient,
        builder: "0xc2af13e1B1de3A015252A115309A0F9DEEDCFa0A",
        maxFeeRate: "0.00001",
        builderName: "ivan3",
        nonce: 123456,
      });

      expect(result.status).toBe(200);
      expect(result.params.signature).toBe("0xabc123");
      expect(result.params.signatureChainId).toBe(56);
      expect(result.params.asterChain).toBe("Mainnet");
      expect(result.params.user).toBe(
        "0x1111111111111111111111111111111111111111"
      );

      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0]?.init?.method).toBe("POST");
      expect(
        fetchCalls[0]?.url.startsWith(
          "https://fapi.asterdex.com/fapi/v3/approveBuilder?"
        )
      ).toBe(true);
      expect(fetchCalls[0]?.url).toContain(
        "builder=0xc2af13e1B1de3A015252A115309A0F9DEEDCFa0A"
      );
      expect(fetchCalls[0]?.url).toContain("maxFeeRate=0.00001");
      expect(fetchCalls[0]?.url).toContain("builderName=ivan3");
      expect(fetchCalls[0]?.url).toContain("nonce=123456");
      expect(fetchCalls[0]?.url).toContain("signature=0xabc123");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws AsterRequestError for non-2xx responses", async () => {
    const walletClient = createWalletClientMock("0xdef456");
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ code: 1001, msg: "bad request" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    try {
      await expect(
        approveBuilder({
          walletClient,
          builder: "0xc2af13e1B1de3A015252A115309A0F9DEEDCFa0A",
          maxFeeRate: "0.00001",
          builderName: "ivan3",
          nonce: 1,
        })
      ).rejects.toMatchObject({
        name: "AsterRequestError",
        status: 400,
        data: { code: 1001, msg: "bad request" },
      } satisfies Partial<AsterRequestError>);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws when walletClient.account is missing", async () => {
    const walletClient = {
      signTypedData: async () => "0x123",
    } as unknown as WalletClient;

    await expect(
      approveBuilder({
        walletClient,
        builder: "0xc2af13e1B1de3A015252A115309A0F9DEEDCFa0A",
        maxFeeRate: "0.00001",
        builderName: "ivan3",
      })
    ).rejects.toThrow("walletClient.account is required");
  });
});
