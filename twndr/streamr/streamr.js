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
	};

	console.log('posting request:', params);

	var req = auth.post(api.post, keys.token, keys.secret, params);

	req.on('response', function(res){
		var timer = new Date();
		res.on('data', function(chunk){
			var raw = chunk.toString();
			raw = raw.replace(/\r\n$/,'').split("\r\n");

			if (raw[0] == '') {
				console.log('*');
			} else {
				try {
					raw.forEach(function(tweet){
						tweet = JSON.parse(tweet);
						if (tweet.geo && isValidGeo(tweet.geo.coordinates, params.locations.split(','))) {
							callback(tweet);
						} else {
							process.stdout.write('.');
						}
					});
				} catch (e) {
					console.log('parsing error', e, raw);
				}
			}
		});

		res.on('end', function(ending){
			console.log('closing connection of', (new Date() - timer) / 1000, 's');
		});
	});
};
