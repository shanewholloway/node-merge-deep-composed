'use strict'
const assert = require('assert')
const mergeDeep = require('../index') // require('merge-deep-composed')

let base = () =>
  ({a: 'aa', b: {c: {msg: 'source cc', value: 2042, base: 'from-base'}}, d: 'dd'})

let overlay = () =>
  ({b: {c: {msg: 'capture me', value: 1942, overlay: 'from-overlay'}}, d: 'DD'})


// "Merge" by replacement

assert.deepEqual(
  mergeDeep({}, base(), overlay()),
  {"a":"aa","b":{"c":{"msg":"capture me","value":1942,"base":"from-base","overlay":"from-overlay"}},"d":"DD"})


// Merge objects differently by path

const merge_ns = mergeDeep.create({
  enter(target, obj, path) {
    if (path === 'b.c')
      return Object.assign({}, obj, target)
  }
})

assert.deepEqual(
  merge_ns({}, base(), overlay()),
  {"a":"aa","b":{"c":{"msg":"source cc","value":2042,"overlay":"from-overlay","base":"from-base"}},"d":"DD"})


// Merge values differently by path

const merge_item = mergeDeep.create({
  item(tgt, src, info) {
    if (info.key_path === 'b.c.msg')
      return `${tgt} ## ${src}`
  }
})

assert.deepEqual(
  merge_item({}, base(), overlay()),
  {"a":"aa","b":{"c":{"msg":"source cc ## capture me","value":1942,"base":"from-base","overlay":"from-overlay"}},"d":"DD"})

