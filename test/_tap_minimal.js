'use strict'
const util = require('util')

function _tap_asYamlExtra(key, value) {
  if (!Array.isArray(value))
    return `${key}: ${JSON.stringify(value)}`

  let lines = value.map(ea => JSON.stringify(ea))
  lines.unshift('')
  return `${key}:\n${lines.join()}\n` }

function _tap_report(success, test, extra) {
  let out = `${success ? 'ok' : 'not ok'} ${test.idx || ''} - ${test.title}`
  if (test.directive)
    out += ` # ${test.directive}`
  if (extra!=null) {
    let lines = Object.keys(extra)
      .map(k => _tap_asYamlExtra(k, extra[k]) )
      .filter(e => e)

    if (lines.length)
      lines = lines.join('\n').split('\n')
    else
      lines = util.inspect(extra).split(/\r?\n/).map(l => '# '+l)

    lines.unshift('')
    out += `\n  ---${lines.join('\n  ')}\n`
  }
  return out }

const tap = {
  start(count) {
    tap._all_tests = []
    tap._tap_idx = 0
    tap.total_pass = 0
    tap.total_fail = 0
    console.log("TAP version 13")
    if (count) this.plan(count) },

  plan(count) { 
    tap.planned_count = count
    console.log(`1..${count}`) },

  finish(count) {
    if (count) this.plan(count)
    if (tap.planned_count != this._tap_idx)
      tap.fail({title: `TAP planned for ${tap.planned_count}, but performed ${this._tap_idx} tests`})
    let tests = tap._all_tests
    tap._all_tests = null
    return Promise.all(tests)
      .then(()=>tap._setExitCode())
  },

  _setExitCode() {
    process.exitCode = (tap.total_fail ? 1 : 0) },

  pass(test, extra) {
    tap.total_pass += 1
    let out = _tap_report(true, test, extra)
    console.log(out) },

  fail(test, extra) {
    tap.total_fail += 1
    let out = _tap_report(false, test, extra)
    console.log(out) },

  test(title, cb) {
    let test = {title, idx: ++this._tap_idx}
    return tap._addTestPromise(
      Promise.resolve(test).then(cb)
        .then(ans => this.pass(test),
              err => this.fail(test, err)))
  },

  _addTestPromise(promise) {
    tap._all_tests.push(promise)
    return promise }
}

module.exports = exports = tap
