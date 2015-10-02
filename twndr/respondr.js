//todo
//

var dev = false;

var Go = require('./go.js'),
    util = require('../lib/util.js').util,
    keys = require('./twitter_keys')[dev ? 'dev_keys' : 'keys'],
    client = new require('twitter')({
      consumer_key: keys.consumerKey,
      consumer_secret: keys.consumerSecret,
      access_token_key: keys.token,
      access_token_secret: keys.secret
    }),
    throttleDelay = 5 * 1000,
    throttled = false,
    bot = (dev ? 'txtzr' : 'twndr'); 


var postTweet = function(tweetObj) {
  console.log('attempting to send', tweetObj);
  if (throttled) {
    return console.log('throttled, try back in ', throttleDelay, 'ms');
  } else {
    throttled = setTimeout(function(){ throttled = false; }, throttleDelay);
  }

  if (dev) return console.log('===== dev mode success =====');
  client.post('statuses/update', tweetObj, function(error, tweet, response){
    if (!error) {
      console.log('=================== success sending ==================:', tweet);
    } else {
      console.log('err:', error);
    }
  });
},
inferCoords = function(tweet) {
  var coords = [], reply = '';
  if (tweet.coordinates) {
    var coords = tweet.coordinates.coordinates; 
    reply += 'I see you\'re at '+coords[1]+','+coords[0];
  } else if (tweet.place) {
    var coords = tweet.place.bounding_box.coordinates[0][0];
    reply += 'I see you\'re at '+tweet.place.full_name+' (' +coords[1]+','+coords[0]+')';
  } else {
    reply += 'all I can see is you\'re in the '+tweet.user.time_zone+', please share your location so I can get you twndrzd';
  }
  return {coords: coords, reply: reply};
},
processTweet = function(tweet){
  
  console.log(tweet);

  if (!tweet.created_at || tweet.in_reply_to_screen_name !== bot) return console.log('not a tweet for me :(');
  
  var payload = tweet.text.replace('@'+bot, '').trim(),
    parsed = util.twitter.parseQuery(payload),
    recipient = '@'+tweet.user.screen_name+' ',
    reply = '';

  if (!parsed.locale && !tweet.place) {

    reply = 'sorry, I can\'t determine your location from the text or data in your tweet';
    postTweet({
      'in_reply_to_status_id': tweet.id_str,
      'status': recipient + reply
    });

  } else {

    if (!parsed.locale && tweet.place) payload = tweet.place.full_name;
   
    console.log('sending payload', payload);

    var Twndr = new Go({
      search: payload,
      twendLength: 130 - recipient.length,
      afterAll: function(go){
        postTweet({
          'in_reply_to_status_id': tweet.id_str,
          'status': recipient + go.twend
        });
      }
    });

  }

};

//test

if (dev) {

  processTweet({text: 'Richmond, VA 25mi 12hr', created_at: true, in_reply_to_screen_name: bot, id_str: '123', user: {screen_name: '_ddubb'}});

} else {

console.log('starting stream for ', bot);

client.stream('user', {with: 'user'}, function(stream){
  
  stream.on('data', processTweet);
  
  stream.on('error', function(error) {
    console.log(error);
  });

});

}
