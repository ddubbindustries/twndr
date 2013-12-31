exports.postTweet = function(text) {

	var https = require('https');
	var OAuth = require('./streamr/node_modules/oauth/').OAuth;
	var keys = require('./streamr/twitter_keys').keys;
	var api = {
		request_token: 'https://api.twitter.com/oauth/request_token',
		access_token: 'https://api.twitter.com/oauth/access_token',
		post:	'https://api.twitter.com/1.1/statuses/update.json',
		geo:	'http://api.twitter.com/1/geo/reverse_geocode.json'	
	};
	var tweeter = new OAuth(
		api.request_token, 
		api.access_token, 
		keys.consumerKey, 
		keys.consumerSecret, 
		'1.0A', 
		null, 
		'HMAC-SHA1'
	);

	body = {
		status: (text ? text : 'testing '+ Math.floor(Math.random()*100000))
		//place_id: '820684853e0f1eb6', // 'lat': 37.2,'long': -80.4
		//display_coordinates: true
	};

	console.log('oauth sending post body:', body);

	tweeter.post(api.post, keys.token, keys.secret, body, 'application/json',
		function(error, data){
			if (error) {
				console.log('oauth post error:', error);
			} else {
				console.log('oauth post success:', data.created_at, data.text);
			}
		}
	);

};
