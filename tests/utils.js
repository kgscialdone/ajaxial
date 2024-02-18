
// export function mockFetch(routes) {
//   window.fetch = async function(path, options) {
//     const url = new URL(path, window.location.href)
//     const route = routes[`${options.method?.toUpperCase() ?? 'GET'} ${url.pathname}`]
//     if(!route) return new Response('', { status: 404, statusText: "Not Found" })
//     route.test?.(url, options)
//     return new Response(route.body, route.responseOptions)
//   }
//   window.fetch.mocked = true
// }

export function html(s,...p) { let fragment = html.raw(s,...p); Ajaxial.process(fragment); return fragment }
html.raw = (s,...p) => document.createRange().createContextualFragment(String.raw({ raw: s }, ...p))

export const assert = Object.assign((c,m) => { 
  if(!c) throw new class AssertionFailed extends Error { name = 'AssertionFailed' }(m) 
}, {
  equal:          (a,b,m) => assert(a === b, m ?? `${a} is not equal to ${b}`),
  looseEqual:     (a,b,m) => assert(a == b,  m ?? `${a} is not loosely equal to ${b}`),
  notEqual:       (a,b,m) => assert(a !== b, m ?? `${a} is equal to ${b}`),
  notLooseEqual:  (a,b,m) => assert(a != b,  m ?? `${a} is loosely equal to ${b}`),
  greater:        (a,b,m) => assert(a > b,   m ?? `${a} is not greater than ${b}`),
  greaterOrEqual: (a,b,m) => assert(a >= b,  m ?? `${a} is not greater than or equal to ${b}`),
  lesser:         (a,b,m) => assert(a < b,   m ?? `${a} is not lesser than ${b}`),
  lesserOrEqual:  (a,b,m) => assert(a <= b,  m ?? `${a} is not lesser than or equal to ${b}`),
  hasField:       (a,b,m) => assert(b in a,  m ?? `${a} does not have a field ${b}`),
  isInstance:     (a,b,m) => assert(a instanceof b, m ?? `${a} is not an instance of ${b}`),
  undefined:      (a,m)   => assert(typeof a === 'undefined', m ?? `${a} is not undefined`),

  shouldThrow: async (desc, callback, testError) => {
    let threw = false
    try { await callback() } catch(err) { threw = testError?.(err) ?? true }
    finally { assert(threw, `expected ${desc} but was not thrown`) }
  },

  async: async (callback, timeout) => { try { await new Promise((res, rej) => {
    setTimeout(() => rej('timed out'), timeout ?? 5000)
    let awaiting = []
    let localAssert = Object.assign(assert.bind(null), assert, { 
      after: (t,cb) => awaiting.push(new Promise((res,rej) => setTimeout(indirect(cb,res,rej), t))),
      on: (el,ev,cb,op) => awaiting.push(new Promise((res,rej) => el.addEventListener(ev, indirect(cb,res,rej), op))),
      callback: cb => { awaiting.push(new Promise((res,rej) => cb = indirect(cb,res,rej))); return cb },
      fetches: (ds,bd,cb=()=>true) => awaiting.push(new Promise((res,rej) => mockRoute(ds,bd,indirect(cb,res,rej)))),
    })
    callback(localAssert)
    Promise.all(awaiting).then(res).catch(rej)
  })} catch(err) { 
    assert(false, `promise rejected by error:\n ${err?.stack ?? err}`) 
  }}
})

const indirect = (callback,res,rej) => (...params) => {
  try { let ret = callback(...params); res(); return ret } catch(err) { rej(err) }
}

let mockedRoutes = {}
function mockRoute(descriptor, options, testCallback) {
  if(window.fetch !== fakeFetch) window.fetch = fakeFetch
  mockedRoutes[descriptor] = typeof options === 'string' 
    ? { body: options, testCallback, status: 200 }
    : Object.assign(options, { testCallback })
}
async function fakeFetch(path, options={}) {
  const url = new URL(path, window.location.href)
  const route = mockedRoutes[`${options.method?.toUpperCase() ?? 'GET'} ${url.pathname}`]
  if(!route) return new Response('', { status: 404, statusText: "Not Found" })
  route.testCallback(url, options)
  return new Response(route.body, { status: route.status ?? 200 })
}