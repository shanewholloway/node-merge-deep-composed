'use strict'
const isObject = require('isobject')

const merge_deep_api = {
  start(api, target, argObjects) {
    // Called at start of `deepMergeOnto(target, ...argObjects)`.
    // Return value to use as api. (e.g. Object.create(api))
    return api },
  finish(api, target, argObjects) {
    // Called at end of `deepMergeOnto(target, ...argObjects)`.
    return target },

  enter(target, key, path) {
    // Called at top of _mergeDeepOne.
    // Any return is passed out of _mergeDeepOne.
  },
  item(tgt, src, info) {
    // Called at top of loop in _mergeDeepOne.
    // Any return overrides other logic.
  },

  merge_objects(tgt, src, info) {
    // Called to merge two objects.
    // Recursion ensues if no value is returned (undefined).
    return undefined },

  merge_arrays(tgt, src, info) {
    // Called to merge two arrays.
    // Default is to replace with `src`.
    return src },
  merge_other(tgt, src, info) {
    // Called to merge two mismatched "values".
    // Default is to replace with `src`.
    return src },
  merge(tgt, src, info) {
    // Called to merge if a more specific method is not present.
    // Default is to replace with `src`.
    return src },

  set(target, key, value, info) {
    // called at the bottom of the loop to commit (key, value) pair
    target[key] = value },

  exit(target, key, path) {
    // called at top of _mergeDeepOne
    // any return is passed out of _mergeDeepOne
    return target },
}

const kindOf = v =>
  v===undefined ? 'undefined'
  : v===null ? 'null'
  : isObject(v) ? 'object'
  : Array.isArray(v) ? 'array'
  : 'other'

const _merge_op_lookup = {
  'array,array': 'merge_arrays',
  'object,object': 'merge_objects', }

function _mergeDeepOne(api, target, obj, path) {
  if (api.enter) {
    let result = api.enter(target, obj, path)
    if (result !== undefined) return result
  }

  let outer_ctx = {api, target, obj, path}
  for(let key of Object.keys(obj)) {
    let key_path = path ? `${path}.${key}` : key
    let value_src = obj[key], src_kind = kindOf(value_src)
    let value_tgt = target[key], tgt_kind = kindOf(value_tgt)
    let op = _merge_op_lookup[[tgt_kind,src_kind]] || 'merge_other'
    let info = {op, tgt_kind, src_kind, key, key_path}
    Object.defineProperty(info, 'outer_ctx', {value: outer_ctx})

    let value = !api.item ? undefined
      : api.item(value_tgt, value_src, info)

    if (value !== undefined) {
      if (info.op == null) continue
      info.op = op = 'override'
    } else if (value_tgt === undefined) {
      info.op = op = 'assign'
      value = value_src
    } else if (op === 'merge_objects') {
      let merge = api.merge_objects || api.merge
      value = !merge ? undefined : merge.call(api, value_tgt, value_src, info)
      if (undefined === value) {
        info.op = op = 'recursive'
        value = _mergeDeepOne(api, value_tgt, value_src, key_path)
      }
    } else {
      let merge = api[op] || api.merge
      value = !merge ? value_src : merge.call(api, value_tgt, value_src, info)
    }

    if (value === undefined) continue
    else if (!api.set) target[key] = value
    else api.set(target, key, value, info)
  }
  if (api.exit) {
    let result = api.exit(target, obj, path)
    if (result !== undefined) return result
  }
  return target
}

function create(api={}) {
  deepMergeOnto.api = api
  api.deepMergeOnto = deepMergeOnto
  return deepMergeOnto

  function deepMergeOnto(target, ...argObjects) {
    if (argObjects.length === 1 && Array.isArray(argObjects[0]))
      argObjects = argObjects[0]

    let api = deepMergeOnto.api
    if (api.start)
      api = api.start(api, target, argObjects) || api

    for(let obj of argObjects)
      _mergeDeepOne(api, target, obj)

    return !api.finish ? target
      : api.finish(api, target, argObjects) }
}

const merge_deep = create()
module.exports = exports = Object.assign(
  merge_deep,
  { create, merge_deep, merge_deep_api, kindOf},
  { array_merges: {
    append: array_merge_append,
    push: array_merge_append,

    incremental: array_merge_incremental,
    incr: array_merge_incremental,
    inc: array_merge_incremental,
  }}
)



function array_merge_append(tgt, src) {
  let absent = src.filter(v => ! ~tgt.indexOf(v))
  return tgt.concat(absent) }

function array_merge_incremental(tgt, src) {
  let ans = Array.from(tgt)

  let tip=null, pre = []
  for(let v of src) {
    let idx = ans.indexOf(v)
    if (idx !== -1) {
      tip = idx
      if (pre) {
        ans.splice(tip, 0, ...pre)
        tip += pre.length
        pre = null
      }
    } else if (tip!==null)
      ans.splice(++tip, 0, v)
    else pre.push(v)
  }
  if (pre) ans.push(...pre)
  return ans }

