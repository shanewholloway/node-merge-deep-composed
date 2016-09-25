'use strict'
const assert = require('assert')
const mergeDeep = require('../index') // require('merge-deep-composed')

let base = () =>
  ({a: 'aa', b: {list: [3,6,9], c: 'cc'}, d: 'dd'})

let overlay = () =>
  ({b: {list: [1,2,6,7,11,9,12], c: 'CC'}, d: 'DD'})


// "Merge" by replacement

assert.deepEqual(
  mergeDeep({}, base(), overlay()),
  {a: 'aa', b: {list: [1,2,6,7,11,9,12], c: 'CC'}, d: 'DD'})


// Or merge by appending the missing items

const merge_append = mergeDeep.create({
  merge_arrays: mergeDeep.array_merges.append })

assert.deepEqual(
  merge_append({}, base(), overlay()),
  {a: 'aa', b: {list: [3,6,9,1,2,7,11,12], c: 'CC'}, d: 'DD'})


// Or merge roughly incrementally

const merge_incremental = mergeDeep.create({
  merge_arrays: mergeDeep.array_merges.incremental })

assert.deepEqual(
  merge_incremental({}, base(), overlay()),
  {a: 'aa', b: {list: [3,1,2,6,7,11,9,12], c: 'CC'}, d: 'DD'})


// Or whatever you want

const merge_extensible = mergeDeep.create({
  merge_arrays(tgt, src, info) {
    return [src, tgt] }
})

assert.deepEqual(
  merge_extensible({}, base(), overlay()),
  {a: 'aa', b: {list: [[1,2,6,7,11,9,12], [3,6,9]], c: 'CC'}, d: 'DD'})


