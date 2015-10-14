var http = require('http'),
    url = require('url'),
    keys = require('./twitter_keys').dev_keys,
    port = 8080,
    req,
    res;

var Twitter = new require('twitter'),
  client = new Twitter({
    consumer_key: keys.consumerKey,
    consumer_secret: keys.consumerSecret,
    access_token_key: keys.token,
    access_token_secret: keys.secret
  });

//,geocode:"37.2300,80.4178,3mi
// http://jsbin.com/yusosumale/1/edit?js,output

http.createServer(function(req, res) {

  console.log('request:', new Date().toISOString(), req.url);

  if (req.headers.host !== 'p.ddubb.net:'+port || req.url.indexOf('/favicon.ico') > -1) {
    res.writeHead(404)
    res.end();
    return false;
  }

  var urlObj = url.parse(req.url, true),
    path = urlObj.pathname.slice(1),
    params = urlObj.query,
    callback = params.callback;

  delete params.callback;

  client.get(path, params, function(err, data, response){
    if (err) data = err;

    data.rate_limit = {
      remaining: response.headers['x-rate-limit-remaining'],
      reset:     response.headers['x-rate-limit-reset']
    };
    
    if (data.statuses) console.log(data.statuses.length, 'tweets sent', data.rate_limit.remaining, 'rate limit remaining');
    data = JSON.stringify(data);
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(callback ? callback + '(' + data + ');' : data);
  });

}).listen(port);

console.log('srvr up on', port);
