'use strict'
const assert = require('assert')
const mergeModule = require('../index') // require('merge-deep-composed')

let base = () =>
  ({a: 'aa', b: {c: {msg: 'source cc', value: 2042, base: 'from-base'}}, d: 'dd'})

let overlay = () =>
  ({b: {c: {msg: 'capture me', value: 1942, overlay: 'from-overlay'}}, d: 'DD'})

// Merge with log

const merge_log = mergeModule.create({
  start(api) {
    return Object.create(api, {log: {value: []}}) },

  finish(api, target) {
    return [target, api.log] },

  set(target, key, value, info) {
    if (value === target[key]) return
    target[key] = value
    this.log.push(info.key_path)
  }})

assert.deepEqual(
  merge_log({}, base(), overlay()),
  [{"a":"aa","b":{"c":{"msg":"capture me","value":1942,"base":"from-base","overlay":"from-overlay"}},"d":"DD"},
   ["a","b","d","b.c.msg","b.c.value","b.c.overlay","d"] ])

