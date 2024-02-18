// Ajaxial v1.0.0 | https://github.com/kgscialdone/ajaxial

const Ajaxial = new function Ajaxial() {
  // Process full document on initial load
  ;(fn => document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn))
   (() => this.process(document.body))

  // Utils for default options
  const defaultKey = Symbol('Ajaxial.default')
  const orDefault  = (obj,key) => obj[key ?? obj[defaultKey]]

  Object.freeze(Object.assign(this, {
    version: '1.0.0',
    default: defaultKey,

    /** Callbacks to retrieve request content, selected by `axjl-method`.
     *  Can be async. Should return `DocumentFragment` or `(parentAfterSwap: Element) => DocumentFragment`.
     *  Returned functions will be called once for each element matching `ajxl-target`, so should be used sparingly. */
    methods: {
      [defaultKey]: 'get',
      get:    request.bind(this, 'GET',    true),
      delete: request.bind(this, 'DELETE', true),
      post:   request.bind(this, 'POST',   false),
      put:    request.bind(this, 'PUT',    false),
      patch:  request.bind(this, 'PATCH',  false),
    },

    /** Callbacks to execute swapping content into the DOM, selected by `ajxl-swap`. 
     *  Should not have extraneous side effects, since they may be dry run to determine parent after swap. */
    swapStrategies: {
      [defaultKey]: 'innerhtml',
      innerhtml:   (target, fragment) => target.replaceChildren(fragment),
      outerhtml:   (target, fragment) => target.replaceWith(fragment),
      beforebegin: (target, fragment) => target.replaceWith(fragment, target),
      afterbegin:  (target, fragment) => target.prepend(fragment),
      beforeend:   (target, fragment) => target.append(fragment),
      afterend:    (target, fragment) => target.replaceWith(target, fragment),
      none:        null,
    },

    /** Callbacks to process params objects into HTTP request bodies, selected by `ajxl-encoding`. */
    requestEncodings: {
      [defaultKey]: 'application/x-www-form-urlencoded',
      'application/x-www-form-urlencoded': params => new URLSearchParams(params),
      'application/json': JSON.stringify,
      'multipart/form-data': params => Object.entries(params).reduce((a,[k,v]) => (a.append(k,v),a), new FormData),
    },

    /** Callbacks to process HTTP response bodies into `DocumentFragment`s, selected by `ajxl-convert`.
     *  Takes `(body: string, ...converterParams: string[])`, returns same as `Ajaxial.methods` entries. */
    responseConverters: {
      [defaultKey]: 'html',
      html: body => parent => {
        let range = document.createRange()
        range.setStart(parent, 0)
        return range.createContextualFragment(body)
      },
      plaintext(body) {
        let fragment = document.createDocumentFragment()
        fragment.append(document.createTextNode(body))
        return fragment
      }
    },

    /** Default trigger events by HTML tag name, falls back to `click`, overridden by `ajxl-event`. */
    defaultEvents: {
      form: 'submit',
      input: 'change',
      select: 'change',
      textarea: 'change',
    },

    /** Search a node and its children for `ajxl-path` and attach Ajaxial event handlers. */
    process(rootNode) {
      const nodes = [...rootNode.querySelectorAll('[ajxl-path]'), rootNode.matches?.('[ajxl-path]') ? rootNode : null]
      for(let node of nodes.filter(n=> n && !n.ajxl)) {
        let nodeRef = new WeakRef(node) // Prevent memory leaks from .ajxl or event handlers retaining references to node
        node.ajxl = new Proxy({}, { get: (_,p) => {
          let inherited = nodeRef.deref().closest(`[ajxl-${p}]`)?.getAttribute(`ajxl-${p}`)
          return inherited?.toLowerCase() === 'disinherit' ? undefined : inherited
        }})

        for(let event of (node.ajxl.event ?? this.defaultEvents[node.tagName.toLowerCase()] ?? 'click').split(/\s/g))
          node.addEventListener(event.startsWith(':') ? `ajaxial${event}` : event, handleTrigger.bind(this, nodeRef))
        dispatch(node, 'load')
      }
    }
  }))

  /** Handle an event watched by `ajxl-trigger`. */
  async function handleTrigger(source, event) {
    if(source instanceof WeakRef) source = source.deref()
    if(event.type === 'submit') event.preventDefault()

    // Debounce triggers by `ajxl-debounce` milliseconds
    if(+source.ajxl.debounce > 0) try { await new Promise((res,rej) => {
      source.ajaxialDebounceAbort?.()
      source.ajaxialDebounceAbort = rej
      setTimeout(() => { res(); delete source.ajaxialDebounceAbort }, +source.ajxl.debounce)
    })} catch { return }

    // Dispatch `ajaxial:trigger` event and stop if canceled
    let context = { source,
      method: orDefault(this.methods, source.ajxl.method),
      targets: source.ajxl.target ? source.getRootNode().querySelectorAll(source.ajxl.target) : [source],
      params: { ...JSON.parse(source.ajxl.params ?? '{}'),
                ...source instanceof HTMLFormElement ? Object.fromEntries(new FormData(source)) : {} }}
    if(!dispatch(source, 'trigger', context)) return

    // Call the method selected by `ajxl-method`, marking with `ajxl-inflight` until finished
    source.setAttribute('ajxl-inflight', '')
    let fragment = await context.method?.(source.ajxl.path, source, context.params)
    source.removeAttribute('ajxl-inflight')

    for(let target of context.targets) {
      // Dispatch `ajaxial:swap` and stop if canceled or values removed
      let context = { source, target, fragment, swapStrategy: orDefault(this.swapStrategies, source.ajxl.swap?.toLowerCase())  }
      if(!dispatch(source, 'swap', context)) continue
      if(!context.target || !context.fragment || !context.swapStrategy) continue

      // Perform per-target fragment parsing if needed, or copy already parsed fragment
      // For per-target parsing, the selected swap strategy is dry-run to determine the parent element after swap
      if(context.fragment instanceof Function) {
        let swapTest = document.createRange().createContextualFragment('<p><t></t></p>')
        context.swapStrategy(swapTest.querySelector('t'), document.createElement('f'))
        context.fragment = context.fragment(swapTest.querySelector('f')?.closest('t') ? target : target.parentElement)
        if(!context.fragment) continue
      } else
        context.fragment = context.fragment.cloneNode(true)

      // Save list of elements to process and perform swap
      let children = Array.from(context.fragment.children)
      context.swapStrategy(context.target, context.fragment)

      // Process each top-level child and apply settle logic
      for(let child of children) {
        child.setAttribute('ajxl-added', '')
        setTimeout(() => child.removeAttribute('ajxl-added'), +source.ajxl.settle ?? 20)
        this.process(child)
      }
    }

    dispatch(source, 'finish')
  }

  /** Dispatch an Ajaxial lifecycle event */
  function dispatch(target, name, detail) {
    return target.dispatchEvent(new CustomEvent(`ajaxial:${name}`, { detail, bubbles: true, composed: true, cancelable: true }))
  }

  /** Perform an HTTP request for the built-in methods */
  function request(method, query, path, source, params) {
    const url  = new URL(path, window.location.href)
    const mime = (query ? null : source.ajxl.encoding) ?? this.requestEncodings[defaultKey]
    const body = query ? undefined : this.requestEncodings[mime]?.(params)
    if(query) Object.entries(params).forEach(([k,v]) => url.searchParams.append(k,v))

    return fetch(url, { method, body, headers: { 'Content-Type': mime, ...JSON.parse(source.ajxl.headers ?? '{}') } })
      .then(resp => dispatch(source, `request${resp.ok ? 'Success' : 'Failure'}`, { source, response: resp, params }) ? resp.text() : '')
      .then(body => {
        // Call the response converter selected by `ajxl-convert`
        let [converter,...params] = (source.ajxl.convert ?? this.responseConverters[defaultKey]).trim().split(/\s+/g)
        return this.responseConverters[converter.toLowerCase()]?.(body, ...params) })
      .catch(error => {
        if(!dispatch(source, 'requestError', { source, error, params })) return
        throw error
      })
  }
}