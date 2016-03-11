module.exports = {
    "extends": "airbnb",
    "plugins": [
        "react"
    ],
    "rules": {
        "no-multiple-empty-lines": [2, {"max": 3, "maxEOF": 1}],
        "no-console": 0,
        "object-shorthand": [2, "never"],
        "no-param-reassign": [2, { "props": false }],
        "arrow-body-style": 0,
        "padded-blocks": 0,
        "prefer-template": 0,
        "no-unused-vars": 0
    }
};
