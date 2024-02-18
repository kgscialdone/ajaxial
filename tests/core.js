import { html, assert } from './utils.js'

export default describe => {
  describe('Core functionality', it => {
    it('should process elements with ajxl-path', () => {
      let testOn = html`<button ajxl-path="/test">Test</button>`
      let button = testOn.querySelector('button')
      assert.hasField(button, 'ajxl')
      assert.equal(button.ajxl.path, '/test')
    })

    it('should fire ajaxial:load on processed elements', () => assert.async(assert => {
      let testOn = html.raw`<button ajxl-path="/test">Test</button>`
      assert.on(testOn.querySelector('button'), 'ajaxial:load', () => true)
      Ajaxial.process(testOn)
    }))

    it('should trigger on submit by default for form elements', () => assert.async(assert => {
      const testOn = html`<form ajxl-path="/test"></form>`
      assert.on(testOn.querySelector('form'), 'ajaxial:trigger', ev => ev.preventDefault())
      testOn.querySelector('form').dispatchEvent(new CustomEvent('submit'))
    }))

    it('should call .preventDefault() on form submit events', temp => assert.async(assert => {
      temp.replaceChildren(html`<form ajxl-path="/test" ajxl-method=""><button type="submit">Submit</button></form>`)
      assert.on(temp.querySelector('form'), 'submit', ev => {
        assert(ev.defaultPrevented, 'default was not prevented')
        ev.preventDefault()
      })
      temp.querySelector('button').click()
    }))

    it('should trigger on change by default for input elements', () => assert.async(assert => {
      const testOn = html`<input ajxl-path="/test" />`
      assert.on(testOn.querySelector('input'), 'ajaxial:trigger', ev => ev.preventDefault())
      testOn.querySelector('input').dispatchEvent(new CustomEvent('change'))
    }))

    it('should trigger on change by default for select elements', () => assert.async(assert => {
      const testOn = html`<select ajxl-path="/test"></select>`
      assert.on(testOn.querySelector('select'), 'ajaxial:trigger', ev => ev.preventDefault())
      testOn.querySelector('select').dispatchEvent(new CustomEvent('change'))
    }))

    it('should trigger on change by default for textarea elements', () => assert.async(assert => {
      const testOn = html`<textarea ajxl-path="/test"></textarea>`
      assert.on(testOn.querySelector('textarea'), 'ajaxial:trigger', ev => ev.preventDefault())
      testOn.querySelector('textarea').dispatchEvent(new CustomEvent('change'))
    }))

    it('should trigger on click by default for other elements', () => assert.async(assert => {
      const testOn = html`<div ajxl-path="/test"></div>`
      assert.on(testOn.querySelector('div'), 'ajaxial:trigger', ev => ev.preventDefault())
      testOn.querySelector('div').dispatchEvent(new CustomEvent('click'))
    }))

    it('should correctly determine method from ajxl-method', () => assert.async(assert => {
      const testOn = html`<button ajxl-path="/test" ajxl-method="post">Test</button>`
      assert.on(testOn.querySelector('button'), 'ajaxial:trigger', ev => {
        ev.preventDefault()
        assert.equal(ev.detail.method, Ajaxial.methods.post, 'ajxl-method="post" does not match on lookup')
      })
      testOn.querySelector('button').click()
    }))

    it('should correctly determine targets from ajxl-target', () => assert.async(assert => {
      const testOn = html`
        <button ajxl-path="/test" ajxl-target="span">Test</button>
        <span data-index="0"></span>
        <span data-index="1"></span>
      `
      assert.on(testOn.querySelector('button'), 'ajaxial:trigger', ev => {
        ev.preventDefault()
        ev.detail.targets.forEach((target,i) => assert.equal(+target.dataset.index, i))
      })
      testOn.querySelector('button').click()
    }))

    it('should correctly determine params from both ajxl-params and form inputs', () => assert.async(assert => {
      const testOn = html`
        <form ajxl-path="/test" ajxl-params='{"powerLevel":27,"scanner":"operational"}'>
          <input name="powerLevel" type="number" value="9001" />
        </form>
      `
      assert.on(testOn.querySelector('form'), 'ajaxial:trigger', ev => {
        ev.preventDefault()
        assert.equal(ev.detail.params.powerLevel, '9001')
        assert.equal(ev.detail.params.scanner, 'operational')
      })
      testOn.querySelector('form').dispatchEvent(new CustomEvent('submit'))
    }))

    it('should correctly determine swap strategy from ajxl-swap', () => assert.async(assert => {
      const testOn = html`<button ajxl-path="/test" ajxl-method="" ajxl-swap="outerHTML">Test</button>`
      assert.on(testOn.querySelector('button'), 'ajaxial:swap', ev => {
        ev.preventDefault()
        assert.equal(ev.detail.swapStrategy, Ajaxial.swapStrategies.outerhtml, 'ajxl-swap="outerHTML" does not match on lookup')
      })
      testOn.querySelector('button').click()
    }))

    it('should correctly dry run swap strategy to determine parent after swap', () => assert.async(assert => {
      const testOn = html`
        <button ajxl-path="/test" ajxl-method="" ajxl-target="span">Test</button>
        <div>${Object.keys(Ajaxial.swapStrategies).map(ss => `<span data-swap="${ss}"></span>`).join('\n')}</div>
      `
      assert.on(testOn.querySelector('button'), 'ajaxial:swap', ev => {
        ev.detail.swapStrategy = Ajaxial.swapStrategies[ev.detail.target.dataset.swap]
        ev.detail.fragment = parent => {
          switch(ev.detail.target.dataset.swap) {
            case 'none': break
            case 'innerhtml':
            case 'afterbegin':
            case 'beforeend':
              assert.equal(parent, ev.detail.target, `incorrect parent on swap for ${ev.detail.target.dataset.swap}`)
              break
            default:
              assert.equal(parent, testOn.querySelector('div'), `incorrect parent on swap for ${ev.detail.target.dataset.swap}`)
              break
          }
        }
      })
      testOn.querySelector('button').click()
    }))

    it('should debounce triggers according to ajxl-debounce', () => assert.async(assert => {
      const testOn = html`<button ajxl-path="/test" ajxl-debounce="10">Test</button>`
      const button = testOn.querySelector('button')
      let clickCount = 0, triggerCount = 0

      assert.on(button, 'click', () => ++clickCount)
      assert.on(button, 'ajaxial:trigger', ev => {
        ev.preventDefault()
        assert.lesser(++triggerCount, 2, 'failed to debounce trigger')
        assert.undefined(button.ajaxialDebounceAbort)
      })

      button.click()
      button.click()
      assert.equal(clickCount, 2)
    }))

    it('should add ajxl-inflight to the trigger source during method execution', () => assert.async(assert => {
      const testOn = html`<button ajxl-path="/test" ajxl-target="">Test</button>`
      assert.on(testOn.querySelector('button'), 'ajaxial:trigger', ev => {
        ev.detail.method = assert.callback(() => {
          assert(testOn.querySelector('button').hasAttribute('ajxl-inflight'), 'ajxl-inflight is not present')
        })
      })
      testOn.querySelector('button').click()
    }))

    it('should remove ajxl-inflight from the trigger source after method execution', () => assert.async(assert => {
      const testOn = html`<button ajxl-path="/test" ajxl-target="">Test</button>`
      assert.on(testOn.querySelector('button'), 'ajaxial:trigger', ev => {
        ev.detail.method = () => { assert.after(0, () => {
          assert(!testOn.querySelector('button').hasAttribute('ajxl-inflight'), 'ajxl-inflight is present')
        })}
      })
      testOn.querySelector('button').click()
    }))

    it('should add ajxl-added to top-level response elements after swap', () => assert.async(assert => {
      const testOn = html`<button ajxl-path="/test">Test</button>`
      assert.on(testOn.querySelector('button'), 'ajaxial:trigger', ev => { 
        ev.detail.method = () => html.raw`<span ajxl-path="/test"></span>`
      })
      assert.on(testOn.querySelector('button'), 'ajaxial:load', ev => { 
        assert(ev.target.hasAttribute('ajxl-added'), 'ajxl-added is not present')
      })
      testOn.querySelector('button').click()
    }))

    it('should remove ajxl-added after a delay according to ajxl-settle', () => assert.async(assert => {
      const testOn = html`<button ajxl-path="/test" ajxl-settle="50">Test</button>`
      assert.on(testOn.querySelector('button'), 'ajaxial:trigger', ev => { 
        ev.detail.method = () => html.raw`<span ajxl-path="/test"></span>`
      })
      assert.after(100, () => { 
        assert(!testOn.querySelector('span').hasAttribute('ajxl-added'), 'ajxl-added is present') 
      })
      testOn.querySelector('button').click()
    }))

    it('should properly disinherit parent attributes', () => {
      const testOn = html`
        <div ajxl-method="post">
          <button ajxl-path="/test">Test</button>
          <div ajxl-method="disinherit">
            <button ajxl-path="/test">Test</button>
          </div>
          <button ajxl-path="/test" ajxl-method="disinherit">Test</button>
        </div>`

      const [inherit, noinherit_inherited, noinherit_intrinsic] = testOn.querySelectorAll('button')
      assert.equal(inherit.ajxl.method, 'post')
      assert.undefined(noinherit_inherited.ajxl.method)
      assert.undefined(noinherit_intrinsic.ajxl.method)
    })
  })
}