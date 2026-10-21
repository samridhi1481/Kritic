import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { createServer } from './index.mjs'

const servers = new Set()

async function startServer(options) {
  const server = createServer(options)
  servers.add(server)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  return `http://127.0.0.1:${address.port}`
}

afterEach(async () => {
  await Promise.all([...servers].map(server => new Promise(resolve => server.close(resolve))))
  servers.clear()
})

test('validates corridor and query before making an upstream request', async () => {
  let upstreamCalls = 0
  const baseUrl = await startServer({
    apiKey: 'test-key',
    fetchImpl: async () => {
      upstreamCalls += 1
      throw new Error('Upstream should not be called for invalid requests')
    },
  })

  const response = await fetch(`${baseUrl}/api/corridor-intelligence`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ corridor: '  ', query: 'railway incidents' }),
  })

  assert.equal(response.status, 400)
  assert.match((await response.json()).error, /corridor/)
  assert.equal(upstreamCalls, 0)
})

test('reports missing server-side API key', async () => {
  const baseUrl = await startServer({ apiKey: '' })
  const response = await fetch(`${baseUrl}/api/corridor-intelligence`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ corridor: 'ECML', query: 'railway updates' }),
  })

  assert.equal(response.status, 503)
  assert.match((await response.json()).error, /TINYFISH_API_KEY/)
})

test('returns TinyFish search results and preserves publication metadata', async () => {
  const requestedUrls = []
  const topics = [
    {
      query: 'rail disruption',
      purpose: 'Find recent rail disruptions',
      title: 'Railway disruption causes train delays',
      snippet: 'Rail services delayed following disruption.',
      path: 'incident',
    },
    {
      query: 'railway line closures',
      purpose: 'Find railway line closures',
      title: 'Railway line closure announced',
      snippet: 'A rail line closure affects passenger services.',
      path: 'closure',
    },
    {
      query: 'severe weather affecting railways',
      purpose: 'Find severe weather',
      title: 'Severe weather disrupts railway services',
      snippet: 'High winds and flooding affect trains.',
      path: 'weather',
    },
    {
      query: 'railway engineering works',
      purpose: 'Find railway engineering works',
      title: 'Railway engineering works scheduled',
      snippet: 'Planned track maintenance and possession.',
      path: 'engineering',
    },
  ]
  const baseUrl = await startServer({
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      const requestUrl = new URL(url)
      requestedUrls.push({ url: requestUrl, options })
      const topic = topics.find(({ query }) => requestUrl.searchParams.get('query').includes(query))
      assert.ok(topic, 'request should contain one of the expected specific rail search queries')

      return Response.json({
        query: requestUrl.searchParams.get('query'),
        total_results: 1,
        page: 0,
        results: [
          {
            position: 1,
            site_name: 'example.org',
            title: topic.title,
            snippet: topic.snippet,
            url: `https://example.org/${topic.path}`,
            date: '2026-10-21',
            publisher: 'Example News',
          },
          {
            position: 2,
            site_name: 'dna-explained.com',
            title: 'DNA Explained',
            snippet: 'Information about human genetics.',
            url: 'https://dna-explained.com/',
          },
        ],
      })
    },
  })

  const response = await fetch(`${baseUrl}/api/corridor-intelligence`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ corridor: 'ECML', query: 'current conditions' }),
  })
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(requestedUrls.length, 4)
  assert.ok(requestedUrls.every(({ options }) => options.headers['X-API-Key'] === 'test-key'))
  assert.ok(requestedUrls.every(({ url }) => url.searchParams.get('location') === 'GB'))
  assert.ok(requestedUrls.every(({ url }) => url.origin === 'https://api.search.tinyfish.ai' && url.pathname === '/'))
  assert.ok(requestedUrls.every(({ url }) => url.searchParams.get('query').includes('ECML current conditions')))
  assert.ok(requestedUrls.every(({ url }) => ['web', 'news'].includes(url.searchParams.get('domain_type'))))
  assert.ok(requestedUrls.every(({ url }) => url.searchParams.get('recency_minutes') === '10080'))
  assert.ok(topics.every(({ query, purpose }) => requestedUrls.some(({ url }) =>
    url.searchParams.get('query').includes(query) && url.searchParams.get('purpose').includes(purpose))))
  assert.equal(body.results.length, 4)
  assert.deepEqual(body.results.map(result => result.title), topics.map(topic => topic.title))
  assert.ok(body.results.every(result => result.snippet))
  assert.equal(body.results[0].date, '2026-10-21')
  assert.equal(body.results[0].publisher, 'Example News')
  assert.deepEqual(body.results.map(result => result.categories), [
    ['Incidents'],
    ['Line blockages'],
    ['Weather warnings'],
    ['Engineering notices'],
  ])
  assert.ok(body.results.every(result => !result.url.includes('dna-explained.com')))
})

test('logs upstream status and a truncated, redacted body and returns a useful error', async () => {
  const loggedErrors = []
  const upstreamBody = JSON.stringify({
    error: 'Search rejected',
    x_api_key: 'test-key',
    authorization: 'Bearer secret-token',
    detail: 'x'.repeat(600),
  })
  const baseUrl = await startServer({
    apiKey: 'test-key',
    logger: { error: (...args) => loggedErrors.push(args) },
    fetchImpl: async () => new Response(upstreamBody, { status: 503 }),
  })

  const response = await fetch(`${baseUrl}/api/corridor-intelligence`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ corridor: 'ECML', query: 'railway updates' }),
  })
  const body = await response.json()

  assert.equal(response.status, 502)
  assert.match(body.error, /HTTP 503/)
  assert.match(body.error, /Search rejected/)
  assert.doesNotMatch(body.error, /test-key|secret-token/)
  assert.equal(loggedErrors.length, 1)
  assert.equal(loggedErrors[0][0], 'Corridor intelligence upstream error:')
  assert.equal(loggedErrors[0][1].status, 503)
  assert.ok(loggedErrors[0][1].responseBody.length <= 500)
  assert.doesNotMatch(JSON.stringify(loggedErrors), /test-key|secret-token/)
})
