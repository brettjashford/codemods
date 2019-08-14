# CODEMODS

## lodashGetToIdx

converts imports and usages of [lodash.get](https://lodash.com/docs/#get) to [idx](https://github.com/facebookincubator/idx). useful for migration to typescript. works for both cjs & es6 modules.

cjs modules:

```javascript
// input
const get = require('lodash.get');

const c = get(obj, 'a.b.c');

// output
const idx = require('idx');

const c = idx(obj, o => o.a.b.c);
```

es6 modules:

```javascript
// input
import get from 'lodash.get';

const c = get(obj, 'a.b.c');

// output
import idx from 'idx';

const c = idx(obj, o => o.a.b.c);
```

### Known Issues

-   the 3rd argument to lodash.get (`get(obj, 'a.b.c', [])`) is not supported. it will remain as a 3rd argument to idx, which idx does not support. the idx babel plugin will thrown an error if configured correctly.
-   the 2nd argument to lodash.get must be a string literal, the following will throw an error in the codemod `get(obj, 'a.b.c' + foo)`.
