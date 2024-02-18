import { assert } from './utils.js'

export default describe => {
  describe('Test harness', it => {
    it('should correctly succeed on assert', () => {
      assert(true)
      assert.equal(1, 1)
      assert.looseEqual(1, '1')
      assert.notEqual(1, 2)
      assert.notLooseEqual(1, '2')
      assert.greater(2, 1)
      assert.greaterOrEqual(1, 1)
      assert.greaterOrEqual(2, 1)
      assert.lesser(1, 2)
      assert.lesserOrEqual(1, 1)
      assert.lesserOrEqual(1, 2)
      assert.hasField({ foo: 1 }, 'foo')
      assert.isInstance(new Date(), Date)
      assert.undefined(undefined)
    })

    it('should correctly fail on assert', () => {
      let asserts = [
        () => assert(false),
        () => assert.equal(1, 2),
        () => assert.looseEqual(1, '2'),
        () => assert.notEqual(1, 1),
        () => assert.notLooseEqual(1, '1'),
        () => assert.greater(1, 2),
        () => assert.greaterOrEqual(1, 2),
        () => assert.lesser(2, 1),
        () => assert.lesserOrEqual(2, 1),
        () => assert.hasField({ foo: 1 }, 'bar'),
        () => assert.isInstance(new Date(), Promise),
        () => assert.undefined(null),
        () => assert.shouldThrow('assertion error', () => assert(true))
      ]
      for(let fn of asserts) 
        assert.shouldThrow('assertion error', fn)
    })

    it('should handle basic async asserts properly', () => assert.async(assert => {
      assert(true)
      assert.equal(1, 1)
      assert.looseEqual(1, '1')
      assert.notEqual(1, 2)
      assert.notLooseEqual(1, '2')
      assert.greater(2, 1)
      assert.greaterOrEqual(1, 1)
      assert.greaterOrEqual(2, 1)
      assert.lesser(1, 2)
      assert.lesserOrEqual(1, 1)
      assert.lesserOrEqual(1, 2)
      assert.hasField({ foo: 1 }, 'foo')
      assert.isInstance(new Date(), Date)
      assert.undefined(undefined)
      assert.shouldThrow('assertion error', () => assert(false))
    }))

    it('should handle awaited async asserts properly', () => assert.async(assert => {
      assert.after(100, () => assert(true))

      assert.on(document.body, 'test', () => assert(true), { once: true })
      document.body.dispatchEvent(new CustomEvent('test'))

      assert.callback(() => assert(true))()

      assert.fetches('GET /test', 'Hello, world!', (url, options) => {
        assert.equal(url.toString(), new URL('/test', window.location.href).toString())
        assert.equal(JSON.stringify(options), '{}')
      })
      fetch('/test')
    }))

    it('should handle failed assertions in awaited async asserts', async () => {
      await assert.shouldThrow('assertion error', () => assert.async(assert => {
        assert.after(100, () => assert(false))
      }))

      await assert.shouldThrow('assertion error', () => assert.async(assert => {
        assert.on(document.body, 'test', () => assert(false), { once: true })
        document.body.dispatchEvent(new CustomEvent('test'))
      }))

      await assert.shouldThrow('assertion error', () => assert.async(assert => {
        assert.callback(() => assert(false))()
      }))

      await assert.shouldThrow('assertion error', () => assert.async(assert => {
        assert.fetches('GET /test', 'Hello, world!', () => assert(false))
        fetch('/test')
      }))
    })
  })
}