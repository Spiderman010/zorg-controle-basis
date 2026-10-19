import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MixSignaal } from "./MixSignaal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("financieringsmix-signaal (Zorg Voorbeeld BV: Wlz en Wmo)", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("toont een neutrale badge 'Info' en geen oranje status, ook al is het signaal oranje", () => {
    act(() =>
      root.render(
        <MixSignaal signaal={{ status: "oranje", message: "Wlz en Wmo tegelijk actief." }} />,
      ),
    );
    const t = container.textContent ?? "";
    expect(t).toContain("Info");
    expect(t).not.toContain("Oranje");
    expect(container.querySelector('[data-status="Oranje"]')).toBeNull();
    expect(t).toContain("Wlz en Wmo tegelijk actief.");
    expect(t).toContain("telt niet mee in de hoofdscore");
  });
});
