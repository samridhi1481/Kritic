import { createServer as createHttpServer } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const TINYFISH_ENDPOINT = 'https://api.search.tinyfish.ai'
const MAX_BODY_BYTES = 8 * 1024
const MAX_RESULTS = 40
const MAX_UPSTREAM_ERROR_CHARS = 500

const searchTopics = [
  {
    category: 'Incidents',
    terms: 'rail disruption train service delays cancellations',
    purpose: 'Find recent rail disruptions and train service incidents affecting the corridor.',
    relevance: /\b(?:disruption|disrupted|delay|delays|delayed|cancellation|cancellations|cancelled|suspension|suspended|incident|derailment|derailed)\b/i,
    domainType: 'news',
  },
  {
    category: 'Line blockages',
    terms: 'railway line closures rail line blockages route closures',
    purpose: 'Find railway line closures or blockages affecting rail services on or near the corridor.',
    relevance: /\b(?:line\s+(?:clos(?:ed|ure|ures)|block(?:ed|age|ages))|route\s+clos(?:ed|ure|ures)|blocked\s+line|line\s+suspended)\b/i,
    domainType: 'web',
  },
  {
    category: 'Weather warnings',
    terms: 'severe weather affecting railways flooding high winds snow',
    purpose: 'Find severe weather and its reported effects on railway infrastructure or train services near the corridor.',
    relevance: /\b(?:weather|flood(?:ing)?|storm|high\s+winds?|snow|extreme\s+heat|landslip|heavy\s+rain)\b/i,
    domainType: 'news',
  },
  {
    category: 'Engineering notices',
    terms: 'railway engineering works planned track maintenance possession',
    purpose: 'Find railway engineering works, track maintenance or possessions affecting the corridor.',
    relevance: /\b(?:engineering|planned\s+works?|track\s+(?:maintenance|renewal|work)|possessions?|infrastructure\s+work)\b/i,
    domainType: 'web',
  },
]

const railwayRelevance = /\b(?:rail(?:way)?|trains?|tracks?|timetables?|stations?)\b/i

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(body))
}

async function readJsonBody(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      const error = new Error('Request body is too large.')
      error.statusCode = 413
      throw error
    }
  }

  try {
    return JSON.parse(body)
  } catch {
    const error = new Error('Request body must be valid JSON.')
    error.statusCode = 400
    throw error
  }
}

function validateRequestBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.'
  }

  if (typeof body.corridor !== 'string' || !body.corridor.trim() || body.corridor.trim().length > 100) {
    return 'corridor must be a non-empty string of at most 100 characters.'
  }

  if (typeof body.query !== 'string' || !body.query.trim() || body.query.trim().length > 200) {
    return 'query must be a non-empty string of at most 200 characters.'
  }

  return null
}

function parseSearchResponse(payload, topic) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.results)) {
    throw new Error('TinyFish returned a response that did not match the documented Search API schema.')
  }

  return payload.results.flatMap(result => {
    if (!result || typeof result !== 'object' ||
      typeof result.title !== 'string' ||
      typeof result.url !== 'string') {
      return []
    }

    const searchableText = `${result.title} ${typeof result.snippet === 'string' ? result.snippet : ''}`
    if (!railwayRelevance.test(searchableText) || !topic.relevance.test(searchableText)) {
      return []
    }

    let url
    try {
      url = new URL(result.url)
    } catch {
      return []
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return []

    return [{
      ...(typeof result.position === 'number' ? { position: result.position } : {}),
      ...(typeof result.site_name === 'string' ? { site_name: result.site_name } : {}),
      title: result.title,
      ...(typeof result.snippet === 'string' ? { snippet: result.snippet } : {}),
      url: url.toString(),
      ...(typeof result.date === 'string' ? { date: result.date } : {}),
      ...(typeof result.publisher === 'string' ? { publisher: result.publisher } : {}),
      ...(Array.isArray(result.authors) && result.authors.every(author => typeof author === 'string') ? { authors: result.authors } : {}),
      ...(typeof result.venue === 'string' ? { venue: result.venue } : {}),
      ...(typeof result.year === 'number' ? { year: result.year } : {}),
      ...(typeof result.cited_by_count === 'number' ? { cited_by_count: result.cited_by_count } : {}),
      ...(typeof result.pdf_url === 'string' ? { pdf_url: result.pdf_url } : {}),
    }]
  })
}

function makeSearchUrl(query, domainType, purpose) {
  const url = new URL(TINYFISH_ENDPOINT)
  url.searchParams.set('query', query)
  url.searchParams.set('purpose', purpose)
  url.searchParams.set('location', 'GB')
  url.searchParams.set('language', 'en')
  url.searchParams.set('domain_type', domainType)
  url.searchParams.set('recency_minutes', '10080')
  return url
}

function requestWithHttps(url, options) {
  return new Promise((resolveRequest, rejectRequest) => {
    let attempts = 0

    const send = () => {
      attempts += 1
      const request = httpsRequest(url, {
        method: options.method,
        headers: { ...options.headers, Connection: 'close' },
        agent: false,
        family: 4,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.2',
        signal: options.signal,
      }, response => {
        const chunks = []
        response.on('data', chunk => chunks.push(chunk))
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')
          resolveRequest(new Response(body, {
            status: response.statusCode,
            headers: response.headers,
          }))
        })
        response.on('error', rejectRequest)
      })

      request.on('error', error => {
        if (error.code === 'ECONNRESET' && attempts < 3) {
          setTimeout(send, attempts * 500)
          return
        }
        rejectRequest(error)
      })
      request.end()
    }

    send()
  })
}

function sanitizeUpstreamErrorBody(body, apiKey) {
  let safeBody = body
  if (apiKey) safeBody = safeBody.split(apiKey).join('[REDACTED]')

  return safeBody
    .replace(/\b(authorization|proxy-authorization|x-api-key)\s*[:=]\s*["']?\s*(?:bearer\s+)?[^,\s"'<>}]+/gi, '$1: [REDACTED]')
    .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|secret|token)\s*["']?\s*[:=]\s*["']?\s*(?:bearer\s+)?[^,\s"'<>}]+/gi, '$1=[REDACTED]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .trim()
    .slice(0, MAX_UPSTREAM_ERROR_CHARS)
}

function makeUpstreamHttpError(status, body) {
  const detail = body || '(empty response body)'
  let prefix = `TinyFish Search returned HTTP ${status}`
  if (status === 401 || status === 403) {
    prefix += '. Authentication was rejected; verify TINYFISH_API_KEY.'
  } else if (status === 429) {
    prefix += '. TinyFish rate limit reached; try again shortly.'
  } else if (status >= 500) {
    prefix += '. TinyFish is currently unavailable.'
  }

  const error = new Error(`${prefix}: ${detail}`)
  error.statusCode = 502
  error.upstreamStatus = status
  error.upstreamBody = detail
  return error
}

function makeNetworkError(error) {
  if (error.code === 'ECONNRESET') {
    return 'TinyFish Search reset the connection. Check the API key or try again shortly.'
  }
  if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError' || error.name === 'AbortError') {
    return 'TinyFish Search timed out. Try again shortly.'
  }
  return 'TinyFish Search is unreachable. Check the server network connection and try again.'
}

export function createServer({
  apiKey = process.env.TINYFISH_API_KEY,
  fetchImpl,
  logger = console,
} = {}) {
  return createHttpServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/api/corridor-intelligence') {
      sendJson(response, 404, { error: 'Not found.' })
      return
    }

    let body
    try {
      body = await readJsonBody(request)
    } catch (error) {
      sendJson(response, error.statusCode || 400, { error: error.message })
      return
    }

    const validationError = validateRequestBody(body)
    if (validationError) {
      sendJson(response, 400, { error: validationError })
      return
    }

    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      sendJson(response, 503, { error: 'TinyFish Search is not configured. Set TINYFISH_API_KEY on the server.' })
      return
    }

    const corridor = body.corridor.trim()
    const query = body.query.trim()

    try {
      const searches = []
      for (const topic of searchTopics) {
        searches.push(await (async () => {
          const searchQuery = `${corridor} ${query} ${topic.terms}`
          const requestOptions = {
            method: 'GET',
            headers: { 'X-API-Key': apiKey },
            signal: AbortSignal.timeout(20_000),
          }
          const upstreamResponse = await (fetchImpl
            ? fetchImpl(makeSearchUrl(searchQuery, topic.domainType, topic.purpose), requestOptions)
            : requestWithHttps(makeSearchUrl(searchQuery, topic.domainType, topic.purpose), requestOptions))

          if (!upstreamResponse.ok) {
            let upstreamBody
            try {
              const responseBody = await upstreamResponse.text()
              upstreamBody = sanitizeUpstreamErrorBody(responseBody, apiKey) || '(empty response body)'
            } catch {
              upstreamBody = '(unable to read response body)'
            }

            throw makeUpstreamHttpError(upstreamResponse.status, upstreamBody)
          }

          let payload
          try {
            payload = await upstreamResponse.json()
          } catch {
            const error = new Error('TinyFish Search returned invalid JSON.')
            error.statusCode = 502
            throw error
          }

          const results = parseSearchResponse(payload, topic)
          return {
            category: topic.category,
            query: typeof payload.query === 'string' ? payload.query : searchQuery,
            total_results: typeof payload.total_results === 'number' ? payload.total_results : results.length,
            page: typeof payload.page === 'number' ? payload.page : 0,
            results: results.map(result => ({ ...result, category: topic.category })),
          }
        })())
      }

      const uniqueResults = new Map()
      for (const search of searches) {
        for (const result of search.results) {
          const key = result.url
          const existing = uniqueResults.get(key)
          if (existing) {
            existing.categories = [...new Set([...existing.categories, result.category])]
            continue
          }
          const { category, ...source } = result
          uniqueResults.set(key, { ...source, categories: [category] })
        }
      }

      sendJson(response, 200, {
        corridor,
        query,
        searches: searches.map(({ results: _results, ...search }) => search),
        results: [...uniqueResults.values()].slice(0, MAX_RESULTS),
      })
    } catch (error) {
      if (error.code || error.name === 'TimeoutError' || error.name === 'AbortError') {
        error.statusCode = 502
        error.message = makeNetworkError(error)
      }
      if (error.upstreamStatus) {
        logger.error('Corridor intelligence upstream error:', {
          status: error.upstreamStatus,
          responseBody: error.upstreamBody,
        })
      } else {
        logger.error('Corridor intelligence search failed:', error)
      }
      sendJson(response, error.statusCode || 502, {
        error: error.message || 'TinyFish Search request failed.',
      })
    }
  })
}

const server = createServer()
const port = 3001
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  server.listen(port, '127.0.0.1', () => {
    console.log(`RailTwin API listening on http://127.0.0.1:${port}`)
  })
}
