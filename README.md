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

_disclaimer: this is my first codemod and it's experimental, use with caution. i recommend manually verifying the transformation_
