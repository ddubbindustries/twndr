var http = require('http'),
    url = require('url'),
    port = 8080,
    getStream = require('./streamr.js').getStream,
    geo = {
      bbg: {
        sw: {x: -80.50, y: 37.15},
        ne: {x: -80.33, y: 37.29}
      },
      nrv: {
        sw: {x: -80.61, y: 37.10},
        ne: {x: -80.34, y: 37.31}
      },
      reg: {
        sw: {x: -81.19, y: 36.68},
        ne: {x: -79.67, y: 37.69}
      },
      reg2: {
        sw: {x: -81, y: 36.68},
        ne: {x: -79, y: 37.69}
      },
      midatl: {
        sw: {x: -83.68, y: 34.59},
        ne: {x: -74.66, y: 40.31}
      },
      _toCSV: function(rect) {
        return [rect.sw.x, rect.sw.y, rect.ne.x, rect.ne.y].join(',');
      }
    },
    tweets = [];

getStream({locations: geo._toCSV(geo.reg)}, function(tweet){
  tweets.push(tweet);
  console.log(tweets.length, tweet.text);
});

http.createServer(function(req, res) {
	
  if (req.url.indexOf('/favicon.ico') > -1) return false;
  
  var params = url.parse(req.url, true).query;
  console.log(new Date().toISOString(), req.url);
  
  var out = JSON.stringify(tweets);
  res.writeHead(200, {"Content-Type": "application/json"});	
  res.end(params.callback ? params.callback + '(' + out + ');' : out);
	tweets = tweets.slice(-200);

}).listen(port);

console.log('srvr up on', port);
