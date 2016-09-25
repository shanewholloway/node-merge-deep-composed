'use strict'
const assert = require('assert')
const inspect = obj => require('util').inspect(obj, {colors:true, depth:null})
const tap = require('./_tap_minimal')

const moduleUnderTest = require('../index')
const merge_deep = require('../index')

tap.start()

tap.test('smoke', () => assert(!!moduleUnderTest))

// validate all examples matching 'examples/ex_*.*'
let examples = require('fs').readdirSync(`${__dirname}/../examples/`)
  .filter(filename => /^ex_.*\.\w+/.test(filename))
  .map(filename =>
    tap.test(`example/${filename}`,
      () => require(`../examples/${filename}`)) )

tap.plan(8 + examples.length)

tap.test('merge objects', () => {
  let res = merge_deep({},
    {a: {b: 1942, c: 'keen', x: {value: 'yz'}}},
    {e: 'eeee', a: {c: 'neato', d: 'deeee'}},
    {a: {x: {value: 'xyz', inner: true}}})

  assert.deepEqual(res,
    {a: {b: 1942, c: 'neato', d: 'deeee', 
         x: {value: 'xyz', inner: true}},
     e: 'eeee'})
})

tap.test('merge array replace', () => {
  let res = merge_deep({},
    {a: {b: [1942, 2142], c: ['untouched']}},
    {a: {b: [2042]}})

  assert.deepEqual(res,
    {a: {b: [2042], c:['untouched']}})
})

tap.test('merge array append absent', () => {
  let merge_deep = moduleUnderTest.create({
    merge_arrays(tgt, src, info) {
      assert.equal(info.op, 'merge_arrays')
      assert.equal(info.tgt_kind, 'array')
      assert.equal(info.src_kind, 'array')
      assert.equal(info.key_path, 'a.b')

      return moduleUnderTest.array_merges.append(tgt, src) }})

  let res = merge_deep({},
    {a: {b: [1942, 2142], c: ['untouched']}},
    {a: {b: [2042, 2142]}})

  assert.deepEqual(res,
    {a: {b: [1942, 2142, 2042], c:['untouched']}})
})

tap.test('merge array incremental', () => {
  let merge_deep = moduleUnderTest.create({
    merge_arrays(tgt, src, info) {
      assert.equal(info.op, 'merge_arrays')
      assert.equal(info.tgt_kind, 'array')
      assert.equal(info.src_kind, 'array')
      assert.equal(info.key_path, 'a.b')

      return moduleUnderTest.array_merges.incremental(tgt, src) }})

  let res = merge_deep({},
    {a: {b: [10, 20, 30, 40, 50], c: ['untouched']}},
    {a: {b: [19, 20, 25, 40, 26]}})

  assert.deepEqual(res,
    {a: {b: [10, 19, 20, 25, 30, 40, 26, 50], c:['untouched']}})
})

tap.test('merge array incremental disjoint', () => {
  let merge_deep = moduleUnderTest.create({
    merge_arrays: moduleUnderTest.array_merges.incremental })

  let res = merge_deep({},
    {a: {b: [10, 20, 30, 40, 50], c: ['untouched']}},
    {a: {b: [11, 21, 31, 41, 49]}})

  assert.deepEqual(res,
    {a: {b: [10,20,30,40,50,11,21,31,41,49], c:['untouched']}})
})

tap.test('merge object with log', () => {
  let log = []
  let merge_deep = moduleUnderTest.create({
    set(target, key, value, info) {
      let log_entry = {op:info.op, key_path:info.key_path, value}
      if (value === target[key]) {
        log_entry.match = 'is'
        delete log_entry.value
      } else if (value == target[key])
        log_entry.match = 'eq'

      log.push(log_entry)
      target[key] = value
    }})

  let res = merge_deep(
    {a: {b: 1942, c: 'keen', s: 'same', x: {value: 'yz'}}},
    {e: 'eeee', a: {c: 'neato', s: 'same', d: 'deeee'}},
    {a: {x: {value: 'xyz', inner: true}, s: 'same'}})

  let log_expected = [
    {"op":"assign","key_path":"e","value":"eeee"},
    {"op":"merge_other","key_path":"a.c","value":"neato"},
    {"op":"merge_other","key_path":"a.s","match":"is"},
    {"op":"assign","key_path":"a.d","value":"deeee"},
    {"op":"recursive","key_path":"a","match":"is"},
    {"op":"merge_other","key_path":"a.x.value","value":"xyz"},
    {"op":"assign","key_path":"a.x.inner","value":true},
    {"op":"recursive","key_path":"a.x","match":"is"},
    {"op":"merge_other","key_path":"a.s","match":"is"},
    {"op":"recursive","key_path":"a","match":"is"},
  ]

  for(let i=0; i<log.length; i++) {
    //console.log(JSON.stringify(log[i])+',')
    assert.deepEqual(log[i], log_expected[i])
  }
})

tap.test('merge object with enter exit log', () => {
  let log = []
  let merge_deep = moduleUnderTest.create({
    enter(target, obj, path) { log.push(['enter', path]) },
    exit(target, obj, path) { log.push(['exit', path]) },
  })

  let res = merge_deep(
    {a: {b: 1942, c: 'keen', s: 'same', x: {value: 'yz'}}},
    {e: 'eeee', a: {c: 'neato', s: 'same', d: 'deeee'}},
    {a: {x: {value: 'xyz', inner: true}, s: 'same'}})

  let log_expected = [
    ["enter",null],
    ["enter","a"],
    ["exit","a"],
    ["exit",null],

    ["enter",null],
    ["enter","a"],
    ["enter","a.x"],
    ["exit","a.x"],
    ["exit","a"],
    ["exit",null],
  ]

  for(let i=0; i<log.length; i++) {
    //console.log(JSON.stringify(log[i])+',')
    assert.deepEqual(log[i], log_expected[i])
  }
})

tap.finish()
