import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import CorridorIntelligence from "./CorridorIntelligence"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("CorridorIntelligence", () => {
  it("shows a loading message while the backend request is pending", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))

    render(<CorridorIntelligence />)

    expect(screen.getByText("Searching external sources...")).toBeTruthy()
  })

  it("shows returned reports with source links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          corridor: "Demo Corridor",
          query: "current railway corridor updates",
          results: [
            {
              title: "Railway disruption reported",
              snippet: "Services delayed after a signal fault.",
              url: "https://example.org/rail-update",
              publisher: "Example Rail News",
            },
          ],
        }),
      }),
    )

    render(<CorridorIntelligence />)

    expect(await screen.findByText("Railway disruption reported")).toBeTruthy()
    expect(screen.getByRole("link", { name: "https://example.org/rail-update" }).getAttribute("href"))
      .toBe("https://example.org/rail-update")
    expect(screen.getByText(/Example Rail News/)).toBeTruthy()
  })

  it("shows the backend error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: "TinyFish Search is not configured." }),
      }),
    )

    render(<CorridorIntelligence />)

    expect((await screen.findByRole("alert")).textContent).toContain(
      "TinyFish Search is not configured.",
    )
  })

  it("shows an empty state when no reports match", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          corridor: "Demo Corridor",
          query: "current railway corridor updates",
          results: [],
        }),
      }),
    )

    render(<CorridorIntelligence />)

    expect(
      await screen.findByText("No external search results found. Try another corridor or query."),
    ).toBeTruthy()
  })

  it("submits the corridor and query to the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ corridor: "ECML", query: "weather warning", results: [] }),
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<CorridorIntelligence />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByLabelText("Corridor"), { target: { value: "ECML" } })
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "weather warning" } })
    fireEvent.click(screen.getByRole("button", { name: "Search" }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/corridor-intelligence",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ corridor: "ECML", query: "weather warning" }),
      }),
    )
  })
})