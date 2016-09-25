# merge-deep-composed

Recursively merge javascript object values with composed extension methods

Inspired by [merge-deep](https://www.npmjs.com/package/merge-deep) with
extensible control over how merging is performed.


### Install

```
$ npm install --save merge-deep-composed
```

### Testing via [TAP](https://testanything.org/)
```
$ npm -s test
TAP version 13
1..11
ok 1 - smoke
ok 2 - example/ex_arrays.js
ok 3 - example/ex_log.js
ok 4 - example/ex_objects.js
ok 5 - merge objects
ok 6 - merge array replace
ok 7 - merge array append absent
ok 8 - merge array incremental
ok 9 - merge array incremental disjoint
ok 10 - merge object with log
ok 11 - merge object with enter exit log
```

Or with test with [faucet](https://www.npmjs.com/package/faucet):

```
$ npm -s test | faucet
✓ smoke
✓ example/ex_arrays.js
✓ example/ex_log.js
✓ example/ex_objects.js
✓ merge objects
✓ merge array replace
✓ merge array append absent
✓ merge array incremental
✓ merge array incremental disjoint
✓ merge object with log
✓ merge object with enter exit log
```

### Use

##### Merge certain objects a different way

```javascript
const mergeDeep = require('merge-deep-composed')

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

```

##### Merge arrays just so…

```javascript
const mergeDeep = require('merge-deep-composed')

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


```


##### Log merge actions

```javascript
let base = () =>
  ({a: 'aa', 
    b: {c: {msg: 'source cc', value: 2042, base: 'from-base'}}, d: 'dd'})

let overlay = () => 
  ({b: {c: {msg: 'capture me', value: 1942, overlay: 'from-overlay'}}, d: 'DD'})

const merge_log = require('merge-deep-composed').create({
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

```



### API

```javascript
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

```

