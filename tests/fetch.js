import { html, assert } from './utils.js'

export default describe => {
  describe('HTTP requests', it => {
    it('should properly execute GET/DELETE requests', () => assert.async(assert => {
      const testRoute = forMethod => (url, { method, body, headers }) => {
        assert.equal(url.toString(), new URL('/test?q=123', window.location.href).toString())
        assert.equal(method, forMethod)
        assert.undefined(body)
        assert.equal(headers['Content-Type'], 'application/x-www-form-urlencoded')
      }
      assert.fetches('GET /test', `<span>Hello, world!</span>`, testRoute('GET'))
      assert.fetches('DELETE /test', `<span>Hello, world!</span>`, testRoute('DELETE'))

      const testOn = html`
        <button ajxl-path="/test" ajxl-method="get" ajxl-params='{"q":123}'>Test</button>
        <button ajxl-path="/test" ajxl-method="delete" ajxl-params='{"q":123}'>Test</button>
      `
      testOn.querySelectorAll('button').forEach(button => {
        assert.on(button, 'ajaxial:finish', () => {
          assert.equal(button.querySelector('span')?.innerText, 'Hello, world!')
        })
        button.click()
      })
    }))

    it('should properly execute POST/PUT/PATCH requests', () => assert.async(assert => {
      const testRoute = forMethod => (url, { method, body, headers }) => {
        assert.equal(url.toString(), new URL('/test', window.location.href).toString())
        assert.equal(method, forMethod)
        assert.equal(body.toString(), 'q=123')
        assert.equal(headers['Content-Type'], 'application/x-www-form-urlencoded')
      }
      assert.fetches('POST /test', `<span>Hello, world!</span>`, testRoute('POST'))
      assert.fetches('PUT /test', `<span>Hello, world!</span>`, testRoute('PUT'))
      assert.fetches('PATCH /test', `<span>Hello, world!</span>`, testRoute('PATCH'))

      const testOn = html`
        <button ajxl-path="/test" ajxl-method="post" ajxl-params='{"q":123}'>Test</button>
        <button ajxl-path="/test" ajxl-method="put" ajxl-params='{"q":123}'>Test</button>
        <button ajxl-path="/test" ajxl-method="patch" ajxl-params='{"q":123}'>Test</button>
      `
      testOn.querySelectorAll('button').forEach(button => {
        assert.on(button, 'ajaxial:finish', () => {
          assert.equal(button.querySelector('span')?.innerText, 'Hello, world!')
        })
        button.click()
      })
    }))

    it('should properly encode headers from ajxl-headers', () => assert.async(assert => {
      assert.fetches('GET /test', '', (_, { headers }) => {
        assert.equal(headers['Test-Header'], 'Success!')
      })
      const testOn = html`<button ajxl-path="/test" ajxl-headers='{"Test-Header":"Success!"}'>Test</button>`
      testOn.querySelector('button').click()
    }))

    it('should properly encode requests as application/x-www-form-urlencoded', () => assert.async(assert => {
      assert.fetches('POST /test', '', (_, { body }) => {
        assert.isInstance(body, URLSearchParams)
        assert.equal(body.toString(), 'powerLevel=9001&scanner=operational')
      })
      const testOn = html`
        <button ajxl-path="/test" ajxl-method="post" 
                ajxl-encoding="application/x-www-form-urlencoded"
                ajxl-params='{"powerLevel":9001,"scanner":"operational"}'
              >Test</button>`
      testOn.querySelector('button').click()
    }))

    it('should properly encode requests as application/json', () => assert.async(assert => {
      assert.fetches('POST /test', '', (_, { body }) => {
        assert.equal(body.toString(), '{"powerLevel":9001,"scanner":"operational"}')
      })
      const testOn = html`
        <button ajxl-path="/test" ajxl-method="post" 
                ajxl-encoding="application/json"
                ajxl-params='{"powerLevel":9001,"scanner":"operational"}'
              >Test</button>`
      testOn.querySelector('button').click()
    }))

    it('should properly encode requests as multipart/form-data', () => assert.async(assert => {
      assert.fetches('POST /test', '', (_, { body }) => {
        assert.isInstance(body, FormData)
        assert.equal('{"powerLevel":"9001","scanner":"operational"}', JSON.stringify(Object.fromEntries(body.entries())))
      })
      const testOn = html`
        <button ajxl-path="/test" ajxl-method="post" 
                ajxl-encoding="multipart/form-data"
                ajxl-params='{"powerLevel":9001,"scanner":"operational"}'
              >Test</button>
      `
      testOn.querySelector('button').click()
    }))

    it('should properly handle file uploads for multipart/form-data', temp => assert.async(assert => {
      assert.fetches('POST /test', '', (_, { body }) => {
        assert.isInstance(body, FormData)
        let file = body.get('file')
        assert.equal(file.name, 'file.txt')
        assert.equal(file.lastModified, mt)
        assert.equal(file.size, 13)
        let testText = assert.callback(text => assert.equal(text, 'Hello, world!'))
        file.text().then(testText)
      })
      temp.replaceChildren(html`
        <form ajxl-path="/test" ajxl-method="post" ajxl-encoding="multipart/form-data">
          <input type="file" name="file" />
          <button type="submit">Submit</button>
        </form>`)
      const dt = new DataTransfer()
      const mt = new Date().getTime()
      dt.items.add(new File(['Hello, world!'], 'file.txt', {type:'text/plain',lastModified:mt}, 'utf-8'))
      temp.querySelector('input').files = dt.files
      temp.querySelector('button').click()
    }))

    it('should trigger ajaxial:requestError on request error', () => assert.async(assert => {
      window.fetch = async function() { throw 'Whoops!' }

      const testOn = html`<button ajxl-path="/test">Test</button>`
      assert.on(testOn.querySelector('button'), 'ajaxial:requestError', ev => {
        ev.preventDefault()
        assert.equal(ev.detail.error, 'Whoops!')
      })
      testOn.querySelector('button').click()
    }, 1000))

    it('should trigger ajaxial:requestSuccess on 2xx response status', () => assert.async(assert => {
      assert.fetches('GET /test1', { status: 200 })
      assert.fetches('GET /test2', { status: 299 })
      const testOn = html`
        <button ajxl-path="/test1">Test</button>
        <button ajxl-path="/test2">Test</button>
      `
      testOn.querySelectorAll('button').forEach(button => {
        assert.on(button, 'ajaxial:requestSuccess', () => true)
        button.click()
      })
    }, 1000))

    it('should trigger ajaxial:requestFailure on non-2xx response status', () => assert.async(assert => {
      assert.fetches('GET /test1', { status: 300 })
      assert.fetches('GET /test2', { status: 400 })
      assert.fetches('GET /test3', { status: 500 })
      const testOn = html`
        <button ajxl-path="/test1">Test</button>
        <button ajxl-path="/test2">Test</button>
        <button ajxl-path="/test3">Test</button>
      `
      testOn.querySelectorAll('button').forEach(button => {
        assert.on(button, 'ajaxial:requestFailure', () => true)
        button.click()
      })
    }, 1000))

    const converterBody = `
      <span>Hello, world!</span>
      <script>document.currentScript.closest('div[data-test]').scriptRan = true</script>
    `.trim()

    it('should properly convert responses to HTML', temp => assert.async(assert => {
      assert.fetches('GET /test', converterBody)
      temp.replaceChildren(html`
        <button ajxl-path="/test" ajxl-target="#html-converter-target" ajxl-convert="html">Test</button>
        <div id="html-converter-target"></div>
      `)
      assert.on(temp.querySelector('button'), 'ajaxial:finish', () => {
        assert.equal(temp.querySelector('div').childNodes.length, 3)
        assert.equal(temp.querySelector('div').children.length, 2)
        assert.equal(temp.querySelector('span')?.innerText, 'Hello, world!')
        assert(temp.scriptRan, 'script did not run')
      })
      temp.querySelector('button').click()
    }))

    it('should properly convert responses to plaintext', temp => assert.async(assert => {
      assert.fetches('GET /test', converterBody)
      temp.replaceChildren(html`
        <button ajxl-path="/test" ajxl-target="#plaintext-converter-target" ajxl-convert="plaintext">Test</button>
        <div id="plaintext-converter-target"></div>
      `)
      assert.on(temp.querySelector('button'), 'ajaxial:finish', () => {
        assert.equal(temp.querySelector('div').childNodes.length, 1)
        assert.equal(temp.querySelector('div').children.length, 0)
        assert.equal(temp.querySelector('div').innerText, converterBody)
        assert(!temp.scriptRan, 'script ran')
      })
      temp.querySelector('button').click()
    }))
  })
}