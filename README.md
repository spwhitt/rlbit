rlbit : Run Length Encoded Bit Lists
====================================

Space + time efficient lists of binary data.

Represents binary data as a list of "segments": objects with a start location (s) and a
length (l) like this:

```
[{"s":10675,"l":5},{"s":10697,"l":8},{"s":10970,"l":10},{"s":10992,"l":10}]
```

This list MUST be sorted by start location "s". But since all operations in this
library maintain the sortedness invariant, you never have to actually sort the
list. This property allows the algorithms to be somewhat efficient!

Supported Operations:

| Operation | Complexity |
| -- | -- |
| **Or / Union**            | O(n) |
| **Subtract / Difference** | O(n) |
| **Intersect**             | O(n) |
| **Invert**                | O(n) |
