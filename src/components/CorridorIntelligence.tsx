import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"

interface CorridorSearchResult {
  position?: number

  categories?: string[]

  site_name?: string

  title: string

  snippet?: string

  url: string

  date?: string

  publisher?: string
}

interface CorridorSearchResponse {
  corridor: string

  query: string

  results: CorridorSearchResult[]
}

const API_PATH = "/api/corridor-intelligence"

const textColor = "#0d1829"

const mutedColor = "#7a8898"

function getResultSource(result: CorridorSearchResult): string {
  if (result.publisher || result.site_name) {
    return result.publisher || result.site_name || "External source"
  }

  try {
    return new URL(result.url).hostname
  } catch {
    return "External source"
  }
}

async function searchCorridor(
  corridor: string,

  query: string,
): Promise<CorridorSearchResponse> {
  const response = await fetch(API_PATH, {
    method: "POST",

    headers: { "content-type": "application/json" },

    body: JSON.stringify({ corridor, query }),
  })

  let payload: CorridorSearchResponse | { error?: string }

  try {
    payload = await response.json()
  } catch {
    throw new Error(
      `Search returned an invalid response (HTTP ${response.status}).`,
    )
  }

  if (!response.ok) {
    throw new Error(
      "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Search failed with HTTP ${response.status}.`,
    )
  }

  if (!("results" in payload) || !Array.isArray(payload.results)) {
    throw new Error("The search service returned an invalid response.")
  }

  return payload
}

export default function CorridorIntelligence() {
  const [corridor, setCorridor] = useState("Demo Corridor")

  const [query, setQuery] = useState("current railway corridor updates")

  const [results, setResults] = useState<CorridorSearchResult[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [lastSuccessfulRefresh, setLastSuccessfulRefresh] =
    useState<Date | null>(null)
  const initialSearchStarted = useRef(false)

  const runSearch = useCallback(
    async (corridorInput: string, queryInput: string) => {
      setLoading(true)

      setError("")

      try {
        const response = await searchCorridor(corridorInput, queryInput)

        setResults(response.results)

        setLastSuccessfulRefresh(new Date())

        setHasSearched(true)
      } catch (searchError) {
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Unable to search corridor intelligence.",
        )

        setResults([])

        setHasSearched(true)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (initialSearchStarted.current) return
    initialSearchStarted.current = true
    void runSearch("Demo Corridor", "current railway corridor updates")
  }, [runSearch])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    void runSearch(corridor, query)
  }

  return (
    <section
      aria-labelledby="corridor-intelligence-title"
      style={{
        backgroundColor: "#ffffff",

        border: "1px solid #dde2ea",

        borderRadius: 10,

        boxShadow: "0 1px 3px rgba(13,24,41,0.06)",

        flexShrink: 0,

        overflow: "hidden",
      }}
    >
      <div
        style={{
          alignItems: "center",

          borderBottom: "1px solid #dde2ea",

          display: "flex",

          justifyContent: "space-between",

          padding: "16px 20px",
        }}
      >
        <div>
          <h2
            id="corridor-intelligence-title"
            style={{
              color: textColor,

              fontFamily: "var(--font-brand)",

              fontSize: 16,

              fontWeight: 700,

              margin: 0,
            }}
          >
            Live Corridor Intelligence
          </h2>
          <p style={{ color: mutedColor, fontSize: 11, margin: "4px 0 0" }}>
            External search results only · Not confirmed railway incidents
          </p>
          <p
            aria-live="polite"
            style={{ color: mutedColor, fontSize: 10, margin: "4px 0 0" }}
          >
            {lastSuccessfulRefresh
              ? `Last successful refresh: ${lastSuccessfulRefresh.toLocaleTimeString()}`
              : "Not refreshed successfully yet"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runSearch(corridor, query)}
          disabled={loading || !corridor.trim() || !query.trim()}
          style={{
            backgroundColor: "#eff4ff",

            border: "1px solid #bfcffd",

            borderRadius: 6,

            color: "#2563eb",

            cursor: loading ? "wait" : "pointer",

            fontFamily: "var(--font-ui)",

            fontSize: 12,

            padding: "7px 12px",
          }}
        >
          {loading && hasSearched ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          alignItems: "center",

          borderBottom: "1px solid #dde2ea",

          display: "flex",

          flexWrap: "wrap",

          gap: 8,

          padding: "12px 20px",
        }}
      >
        <label
          htmlFor="corridor-search-corridor"
          style={{ color: mutedColor, fontSize: 11 }}
        >
          Corridor
        </label>
        <input
          id="corridor-search-corridor"
          value={corridor}
          onChange={(event) => setCorridor(event.target.value)}
          maxLength={100}
          required
          style={{
            backgroundColor: "#f8fafc",

            border: "1px solid #dde2ea",

            borderRadius: 6,

            color: textColor,

            fontFamily: "var(--font-ui)",

            fontSize: 12,

            minWidth: 150,

            padding: "7px 9px",
          }}
        />
        <label
          htmlFor="corridor-search-query"
          style={{ color: mutedColor, fontSize: 11 }}
        >
          Search
        </label>
        <input
          id="corridor-search-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={200}
          required
          style={{
            backgroundColor: "#f8fafc",

            border: "1px solid #dde2ea",

            borderRadius: 6,

            color: textColor,

            flex: "1 1 240px",

            fontFamily: "var(--font-ui)",

            fontSize: 12,

            minWidth: 160,

            padding: "7px 9px",
          }}
        />
        <button
          type="submit"
          disabled={loading || !corridor.trim() || !query.trim()}
          style={{
            backgroundColor: "#2563eb",

            border: "1px solid #2563eb",

            borderRadius: 6,

            color: "#ffffff",

            cursor: loading ? "wait" : "pointer",

            fontFamily: "var(--font-ui)",

            fontSize: 12,

            fontWeight: 600,

            padding: "7px 14px",
          }}
        >
          {loading && !hasSearched ? "Searching..." : "Search"}
        </button>
      </form>

      <div
        aria-live="polite"
        style={{
          maxHeight: 360,
          minHeight: 72,
          overflowY: "auto",
          padding: 12,
        }}
      >
        {loading && (
          <p
            style={{
              color: mutedColor,
              fontSize: 12,
              margin: 8,
              textAlign: "center",
            }}
          >
            Searching external sources...
          </p>
        )}
        {error && (
          <p
            role="alert"
            style={{
              backgroundColor: "#fef2f2",

              border: "1px solid #fca5a5",

              borderRadius: 6,

              color: "#b91c1c",

              fontSize: 12,

              lineHeight: 1.5,

              margin: 0,

              padding: "10px 12px",
            }}
          >
            {error}
          </p>
        )}
        {!loading && !error && hasSearched && results.length === 0 && (
          <p
            style={{
              color: mutedColor,
              fontSize: 12,
              margin: 8,
              textAlign: "center",
            }}
          >
            No external search results found. Try another corridor or query.
          </p>
        )}
        {results.map((result) => (
          <article
            key={result.url}
            style={{
              backgroundColor: "#f8fafc",

              border: "1px solid #e8edf3",

              borderRadius: 6,

              marginBottom: 8,

              padding: "10px 12px",
            }}
          >
            <div
              style={{
                color: textColor,
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              {result.title}
            </div>            
          {result.categories &&
            result.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {result.categories.map((category) => (
                  <span
                    key={category}
                    className="px-2 py-1 rounded text-[10px]
                              bg-blue-50 text-blue-700
                              border border-blue-200"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
            
            {result.snippet && (
              <p
                style={{
                  color: "#374151",
                  fontSize: 11,
                  lineHeight: 1.5,
                  margin: "5px 0 0",
                }}
              >
                {result.snippet}
              </p>
            )}
            <p style={{ color: mutedColor, fontSize: 10, margin: "6px 0 0" }}>
              Source: {getResultSource(result)}
              {result.date ? ` · ${result.date}` : ""}
            </p>
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#2563eb",
                display: "inline-block",
                fontSize: 10,
                marginTop: 5,
                overflowWrap: "anywhere",
                textDecoration: "underline",
              }}
            >
              {result.url}
            </a>
          </article>
        ))}
      </div>
      <p
        style={{
          borderTop: "1px solid #dde2ea",

          color: mutedColor,

          fontSize: 10,

          lineHeight: 1.5,

          margin: 0,

          padding: "9px 20px",
        }}
      >
        Search results are external reports, not verified operational status.
        Confirm potential disruptions with authoritative railway sources.
      </p>
    </section>
  )
}
