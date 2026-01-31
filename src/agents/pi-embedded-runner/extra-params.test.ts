import { describe, expect, it, vi } from "vitest";

import type { OpenClawConfig } from "../../config/config.js";
import { applyExtraParamsToAgent } from "./extra-params.js";

describe("applyExtraParamsToAgent (openai-responses instructions)", () => {
  it("injects instructions from systemPrompt and strips the leading system prompt input item", () => {
    const cfg = {
      agents: {
        defaults: {
          models: {
            "codex-proxy/gpt-5.2": {
              params: {
                openaiResponsesInstructions: "systemPrompt",
              },
            },
          },
        },
      },
    } satisfies OpenClawConfig;

    const userOnPayload = vi.fn();
    let seenPayload: Record<string, unknown> | null = null;

    const agent: { streamFn?: any } = {
      streamFn: (_model: unknown, context: unknown, options: unknown) => {
        const systemPrompt =
          typeof (context as { systemPrompt?: unknown }).systemPrompt === "string"
            ? (context as { systemPrompt: string }).systemPrompt
            : "";
        const payload: Record<string, unknown> = {
          model: "gpt-5.2",
          input: [
            { role: "system", content: systemPrompt },
            { role: "user", content: [{ type: "input_text", text: "hi" }] },
          ],
          stream: true,
        };
        const onPayload = (options as { onPayload?: (p: unknown) => void } | undefined)?.onPayload;
        onPayload?.(payload);
        seenPayload = payload;
        return null as any;
      },
    };

    applyExtraParamsToAgent(agent, cfg, "codex-proxy", "gpt-5.2");

    agent.streamFn?.(
      { api: "openai-responses", provider: "codex-proxy", id: "gpt-5.2" },
      { systemPrompt: "SYS" },
      { onPayload: userOnPayload },
    );

    expect(userOnPayload).toHaveBeenCalledTimes(1);
    expect(seenPayload).not.toBeNull();
    expect(seenPayload?.instructions).toBe("SYS");
    expect(Array.isArray(seenPayload?.input)).toBe(true);
    expect((seenPayload?.input as any[])[0]).toMatchObject({ role: "user" });
  });

  it("does not override existing instructions", () => {
    const cfg = {
      agents: {
        defaults: {
          models: {
            "codex-proxy/gpt-5.2": {
              params: {
                openaiResponsesInstructions: "systemPrompt",
              },
            },
          },
        },
      },
    } satisfies OpenClawConfig;

    let seenPayload: Record<string, unknown> | null = null;

    const agent: { streamFn?: any } = {
      streamFn: (_model: unknown, _context: unknown, options: unknown) => {
        const payload: Record<string, unknown> = {
          model: "gpt-5.2",
          instructions: "EXISTING",
          input: [{ role: "system", content: "SYS" }],
          stream: true,
        };
        const onPayload = (options as { onPayload?: (p: unknown) => void } | undefined)?.onPayload;
        onPayload?.(payload);
        seenPayload = payload;
        return null as any;
      },
    };

    applyExtraParamsToAgent(agent, cfg, "codex-proxy", "gpt-5.2");

    agent.streamFn?.(
      { api: "openai-responses", provider: "codex-proxy", id: "gpt-5.2" },
      { systemPrompt: "SYS" },
      undefined,
    );

    expect(seenPayload).not.toBeNull();
    expect(seenPayload?.instructions).toBe("EXISTING");
    expect(seenPayload?.input).toEqual([{ role: "system", content: "SYS" }]);
  });
});
