import { describe, expect, it } from "vitest";

import { maskCpf } from "@/lib/maskCpf";

describe("maskCpf", () => {
  it("masks cpf digits", () => {
    expect(maskCpf("12345678901")).toBe("123.***.***-01");
  });

  it("returns default mask for invalid input", () => {
    expect(maskCpf("abc")).toBe("***.***.***-**");
  });
});
