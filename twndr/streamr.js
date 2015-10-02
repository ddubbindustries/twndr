var http = require('http'),
    url = require('url'),
    keys = require('./twitter_keys').dev_keys,
    port = 8081,
    req,
    res;

var Twitter = new require('twitter'),
  client = new Twitter({
    consumer_key: keys.consumerKey,
    consumer_secret: keys.consumerSecret,
    access_token_key: keys.token,
    access_token_secret: keys.secret
  });

http.createServer(function(req, res){

  client.stream('statuses/filter', {track: 'mindy'}, function(stream) {
    stream.on('data', function(tweet){
      console.log(tweet.text);
      res.writeHead(200, {"Content-Type": "application/json"});
      res.end(tweet);
    });
    stream.on('error', function(err){
      console.log('err');
    });
  });

}).listen(port);
