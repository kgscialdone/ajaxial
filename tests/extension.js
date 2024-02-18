import { html, assert } from './utils.js'

export default describe => {
  describe('Extensibility', it => {
    it('should properly handle custom methods', () => assert.async(assert => {
      let testOn = html`<button ajxl-path="/test" ajxl-method="test" ajxl-params='{"powerLevel":9001}'>Test</button>`
      let button = testOn.querySelector('button')

      Ajaxial.methods.test = assert.callback((path, source, params) => {
        assert.equal(path, '/test')
        assert.equal(source, button)
        assert.equal(params.powerLevel, 9001)
        return html.raw`<pre>${JSON.stringify(params)}</pre>`
      })
      assert.on(button, 'ajaxial:finish', () => {
        assert.equal(button.querySelector('pre').innerText, '{"powerLevel":9001}')
        delete Ajaxial.methods.test
      })
      button.click()
    }))

    it('should properly handle custom swap strategies', () => assert.async(assert => {
      let testOn = html`<button ajxl-path="/test" ajxl-swap="testSwap">Test</button>`
      let button = testOn.querySelector('button')

      Ajaxial.swapStrategies.testswap = assert.callback((target, fragment) => {
        assert.equal(target, button)
        assert.equal(fragment.children[0].nodeName, 'P')
        assert.equal(fragment.children[0].innerText, 'Hello, world!')
        button.replaceChildren(fragment)
      })
      assert.on(button, 'ajaxial:trigger', ev => {
        ev.detail.method = () => html.raw`<p>Hello, world!</p>`
      })
      assert.on(button, 'ajaxial:finish', () => {
        assert.equal(button.children[0].nodeName, 'P')
        assert.equal(button.children[0].innerText, 'Hello, world!')
        delete Ajaxial.swapStrategies.testswap
      })
      button.click()
    }))

    it('should properly determine target parent context for custom swap strategies', () => assert.async(assert => {
      let testOn = html`
        <button ajxl-path="/test" ajxl-swap="testSwapContext" ajxl-target="div,table">Test</button>
        <div></div>
        <table></table>
      `
      let button = testOn.querySelector('button')
      let div    = testOn.querySelector('div')
      let table  = testOn.querySelector('table')

      let testDiv   = assert.callback(parent => { 
        assert.equal(parent, div); 
        return Ajaxial.responseConverters.html('<td>Hello, world!</td>')(parent)
      })
      let testTable = assert.callback(parent => { 
        assert.equal(parent, table); 
        return Ajaxial.responseConverters.html('<td>Hello, world!</td>')(parent)
      })

      Ajaxial.swapStrategies.testswapcontext = assert.callback((target, fragment) => target.replaceChildren(fragment))
      assert.on(button, 'ajaxial:swap', ev => ev.detail.fragment = (ev.detail.target === div) ? testDiv : testTable)
      assert.on(button, 'ajaxial:finish', () => {
        assert.isInstance(div.childNodes[0], Text)
        assert.equal(div.childNodes[0].data, 'Hello, world!')
        
        assert.equal(table.children[0].tagName, 'TBODY')
        assert.equal(table.children[0].children[0].tagName, 'TR')
        assert.equal(table.children[0].children[0].children[0].tagName, 'TD')
        assert.equal(table.children[0].children[0].children[0].innerText, 'Hello, world!')

        delete Ajaxial.swapStrategies.testswapcontext
      })
      button.click()
    }))

    it('should properly handle custom request encodings', () => assert.async(assert => {
      let testOn = html`
        <button ajxl-path="/test" ajxl-method="post" ajxl-encoding="test" 
                ajxl-params='{"powerLevel":9001,"scanner":"operational"}'>Test</button>`
      assert.fetches('POST /test', '', (_, { body }) => assert.equal(body, 'powerLevel:9001,scanner:operational'))
      Ajaxial.requestEncodings.test = params => {
        delete Ajaxial.requestEncodings.test
        return Object.entries(params).map(([k,v]) => `${k}:${v}`).join(',')
      }
      testOn.querySelector('button').click()
    }))

    it('should properly handle custom response converters', () => assert.async(assert => {
      let testOn = html`<button ajxl-path="/test" ajxl-convert="test">Test</button>`
      let button = testOn.querySelector('button')
      assert.fetches('GET /test', 'Hello, world!')
      Ajaxial.responseConverters.test = body => html.raw`<p>${body}</p>`
      assert.on(button, 'ajaxial:finish', () => {
        assert.isInstance(button.children[0], HTMLParagraphElement)
        assert.equal(button.children[0].innerText, 'Hello, world!')
        delete Ajaxial.responseConverters.test
      })
      button.click()
    }))

    it('should properly handle overriding default events', () => assert.async(assert => {
      Ajaxial.defaultEvents.div = 'test'
      let testOn = html`<div ajxl-path="/test"></div>`
      assert.on(testOn.querySelector('div'), 'ajaxial:trigger', () => delete Ajaxial.defaultEvents.div)
      testOn.querySelector('div').dispatchEvent(new CustomEvent('test'))
    }))
  })
}