//coinkite-helper.js
var CK_API = require('coinkite-javascript/coinkite-api.js'),
    request = require('request'),
    apiKeys = {
        KEY: 'YOUR API KEY HERE',
        SECRET: 'YOUR API KEY SECRET HERE'
    };
function makeRequest(endPoint, method, params, cb) {
    request({
        url: 'https://api.coinkite.com' + endPoint,
        headers: CK_API.auth_headers(apiKeys.KEY, apiKeys.SECRET, endPoint),
        method: method,
        json: params || true
    }, function(error, response, body) {
        if (error) {
            return cb(error);
        }
        if (response && response.statusCode !== 200) {
            return cb(new Error(response.statusCode + ': ' + JSON.stringify(body)));
        }
        cb(null, response, body);
    });
}

var RateLimiter = require('limiter').RateLimiter;

var limiter = new RateLimiter(1, 3500); // at most 1 request every 3500 ms
exports.request = function throttledRequest() {
    var requestArgs = arguments;
    limiter.removeTokens(1, function() {
        makeRequest.apply(this, requestArgs);
    });
};