import { describe, expect, it } from "bun:test";
import type { WalletClient } from "viem";
import { AsterRequestError, getAgents, updateAgent } from "./agent";

function createWalletClientMock(signature: `0x${string}`): WalletClient {
  return {
    account: { address: "0x2222222222222222222222222222222222222222" },
    signTypedData: async () => signature,
  } as unknown as WalletClient;
}

describe("getAgents", () => {
  it("signs query and sends GET /fapi/v3/agent with signature", async () => {
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
    const originalFetch = globalThis.fetch;
    const walletClient = createWalletClientMock("0xabc123");

    globalThis.fetch = (async (input, init) => {
      fetchCalls.push({ url: String(input), init });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const result = await getAgents({
        walletClient,
        user: "0x1111111111111111111111111111111111111111",
        signer: "0x2222222222222222222222222222222222222222",
        nonce: 123456,
      });

      expect(result.status).toBe(200);
      expect(result.params.user).toBe(
        "0x1111111111111111111111111111111111111111"
      );
      expect(result.params.signer).toBe(
        "0x2222222222222222222222222222222222222222"
      );
      expect(result.params.asterChain).toBe("Mainnet");
      expect(result.params.signature).toBe("0xabc123");

      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0]?.init?.method).toBe("GET");
      expect(
        fetchCalls[0]?.url.startsWith("https://fapi.asterdex.com/fapi/v3/agent?")
      ).toBe(true);
      expect(fetchCalls[0]?.url).toContain(
        "asterChain=Mainnet&user=0x1111111111111111111111111111111111111111&signer=0x2222222222222222222222222222222222222222&nonce=123456"
      );
      expect(fetchCalls[0]?.url).toContain("signature=0xabc123");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("allows passing precomputed signature without walletClient", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    try {
      const result = await getAgents({
        user: "0x9999999999999999999999999999999999999999",
        signer: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        asterChain: "Testnet",
        nonce: 1,
        signature: "0xdef456",
      });

      expect(result.params.user).toBe(
        "0x9999999999999999999999999999999999999999"
      );
      expect(result.params.signer).toBe(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      );
      expect(result.params.asterChain).toBe("Testnet");
      expect(result.params.nonce).toBe(1);
      expect(result.params.signature).toBe("0xdef456");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws if signer does not match walletClient.account", async () => {
    const walletClient = createWalletClientMock("0xabc123");
    await expect(
      getAgents({
        walletClient,
        user: "0x1111111111111111111111111111111111111111",
        signer: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        nonce: 1,
      })
    ).rejects.toThrow("signer must match walletClient.account.address");
  });

  it("throws AsterRequestError for non-2xx responses", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ code: 1001, msg: "bad request" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    try {
      await expect(
        getAgents({
          user: "0x1111111111111111111111111111111111111111",
          signer: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          nonce: 1,
          signature: "0xdeadbeef",
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

  it("throws when neither signature nor walletClient is provided", async () => {
    await expect(
      getAgents({
        user: "0x1111111111111111111111111111111111111111",
        signer: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        nonce: 1,
      })
    ).rejects.toThrow(
      "getAgents requires either signature or walletClient to sign the query"
    );
  });
});

describe("updateAgent", () => {
  it("signs and posts to /fapi/v3/updateAgent", async () => {
    const walletClient = createWalletClientMock("0xaaa111");
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
      const result = await updateAgent({
        walletClient,
        agentAddress: "0x3333333333333333333333333333333333333333",
        canSpotTrade: false,
        canPerpTrade: true,
        canWithdraw: false,
        nonce: 123,
      });

      expect(result.status).toBe(200);
      expect(result.params.signature).toBe("0xaaa111");
      expect(result.params.signatureChainId).toBe(56);
      expect(result.params.user).toBe(
        "0x2222222222222222222222222222222222222222"
      );
      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0]?.init?.method).toBe("POST");
      expect(fetchCalls[0]?.url).toContain("/fapi/v3/updateAgent?");
      expect(fetchCalls[0]?.url).toContain("agentAddress=0x3333333333333333333333333333333333333333");
      expect(fetchCalls[0]?.url).toContain("canSpotTrade=false");
      expect(fetchCalls[0]?.url).toContain("canPerpTrade=true");
      expect(fetchCalls[0]?.url).toContain("canWithdraw=false");
      expect(fetchCalls[0]?.url).toContain("signature=0xaaa111");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws AsterRequestError for non-2xx responses", async () => {
    const walletClient = createWalletClientMock("0xbbb222");
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ code: 1001, msg: "bad request" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    try {
      await expect(
        updateAgent({
          walletClient,
          agentAddress: "0x3333333333333333333333333333333333333333",
          canSpotTrade: false,
          canPerpTrade: true,
          canWithdraw: false,
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
});
