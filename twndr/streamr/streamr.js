exports.getStream = function(params, callback) {

	if (typeof require == 'undefined') require = Npm.require;

	var https = require('https'),
      OAuth = require('oauth').OAuth,
      keys = require('./twitter_keys.js').keys,
      api = {
        request_token: 'https://api.twitter.com/oauth/request_token',
        access_token: 'https://api.twitter.com/oauth/access_token',
        //post:	'https://api.twitter.com/1.1/statuses/update.json',
        post: 'https://stream.twitter.com/1.1/statuses/filter.json',
        geo:	'http://api.twitter.com/1/geo/reverse_geocode.json'	
      },
      auth = new OAuth(
        api.request_token, 
        api.access_token, 
        keys.consumerKey, 
        keys.consumerSecret, 
        '1.0A', 
        null, 
        'HMAC-SHA1'
      );

	var isValidGeo = function(coord, rect) {
		return (coord[0] > rect[1] 
			&& coord[0] < rect[3] 
			&& coord[1] > rect[0]
			&& coord[1] < rect[2]
		);
	},
  filterTweet = function(tweet) {
    if (tweet.geo && isValidGeo(tweet.geo.coordinates, params.locations.split(','))) {
      process.stdout.write(tweet.place.full_name + ': ' + tweet.text);
      callback(tweet);
    } else {
      process.stdout.write('x');
    }
  },
  startStream = function() {

    console.log('posting request:', params);

    var req = auth.post(api.post, keys.token, keys.secret, params),
        raw = '', 
        tweet = {};

    req.on('response', function(res){
      var timer = new Date();
      res.on('data', function(chunk){
        raw += chunk.toString();
        try {
          tweet = JSON.parse(raw.replace(/\r\n$/,''));
          filterTweet(tweet);
          raw = '';
        } catch (e) {
          process.stdout.write('.');
        }
      });

      res.on('end', function(ending){
        console.log('closing connection of', (new Date() - timer) / 1000, 's');
        startStream();
      });
    });

  };

  startStream();

};
