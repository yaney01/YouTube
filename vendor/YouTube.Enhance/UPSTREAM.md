# YouTube Enhance vendored scripts

These two runtime bundles originated from Maasea/sgmodule commit
`65075cdb388fc5e3094afd7e7314c67b243f3525` under the repository's Apache-2.0
license. They are vendored here so this branch can test and modify the YouTube
playback path without a runtime dependency on another repository.

| File | Upstream path | Upstream SHA-256 | Local SHA-256 |
| --- | --- | --- | --- |
| `youtube.response.js` | `Script/Youtube/youtube.response.js` | `f98483d5f5017514f82502253c0db5ce2d4ffb7839887aa2cadc22666f5a7f12` | `baeee0595e49ba21fe02b2d7ca11180b094bc6d616701e10cea2c436e77dd714` |
| `youtube.request.js` | `Script/Youtube/youtube.request.js` | `3ecca15e06e76a31720092c581180f648ef2c45e494644941ba985c878efbb26` | `3ecca15e06e76a31720092c581180f648ef2c45e494644941ba985c878efbb26` |

Local modification to `youtube.response.js`: the caption handler no longer
creates a direct `tlang` track or changes the default caption. It preserves the
server-provided translation list and only inserts the configured language when
missing, so translation remains a user-selected YouTube UI action.
