function Go(args) {

if (typeof(window) == 'undefined') {
  //LocalStorage = require('./streamr/node_modules/node-localstorage').LocalStorage;
  //localStorage = new LocalStorage('../localStore', 25*1024*1024);
  $ = require('jquery');
  util = require('../lib/util.js').util;
  lex = require('../lib/lexr.js').lex;
}

var go = {
  cfg: {
    url: 'http://p.ddubb.net:8080',
    api: {
      q: '',
      geocode: '37.2300,-80.4178,5mi',
      result_type: 'recent',
      lang: 'en',
      count: 100
    },
    apiMax: 10,
    cache: true,
    maxRetweet: 10,
    locale: 'Blacksburg, VA',
    radius: '5mi',
    hoursHistory: 48,
    search: 'Blacksburg, VA 5mi 48hr',
    twendLength: 130,
    afterGeo: function(){console.log('afterGeo');},
    afterBatch: function(){console.log('afterBatch');},
    afterAll: function(){console.log('afterAll');}
  },
  init: function(args){ 
    console.time('total time');    
    lex.init();
    go.cfg.startTime = new Date().getTime();
    $.each(args || {}, function(k,v) {
      go.cfg[k] = v;
    });
    go.tweetStore = {ok: {}, bot: {}, rt: {}, reply: {}, chatty: {}, nogeo: {}, users: {}};
    go.twend = 'no tweets found';
    go.apiCallCount = go.cfg.apiMax;
    console.log('set globals go.cfg', go.cfg);
    go.parseSearch(go.cfg.search);
    go.getGeo(go.cfg.locale, function(coords) { 
      go.cfg.api.geocode = [coords[1], coords[0], go.cfg.radius].join(',');
      go.cfg.afterGeo(go.cfg.api.geocode);
      go.getAPI('/search/tweets', go.cfg.api, go.router);
    });
  },
  parseSearch: function(search) {
    var parsed = util.twitter.parseQuery(search);
    go.cfg.hoursHistory = parseInt(parsed.time.replace('hr','')) || go.cfg.hoursHistory;
    go.cfg.locale = parsed.locale || go.cfg.locale;
    go.cfg.radius = parsed.distance || go.cfg.radius;
  },
  getGeo: function(locale, success) {
    if (typeof getGoogleCoords == 'function') {
      getGoogleCoords(locale, function(data){
        var coords = data[0].geometry.location;
        success([coords.M, coords.J]); // not sure why it's these arbitrary keys, pure compression for speed?
      });
    } else {
      go.getAPI('/geo/search', {query: locale}, function(data) {
        var coords = data.result.places[0].centroid;
        success(coords);
      });
    }
  },
  getAPI: function(path, params, callback) {
    go.apiStartTime = new Date();
    var key = path + '?'+ (typeof params == 'object' ? $.param(params) : params);
    if (go.cfg.cache && localStorage && localStorage[key]) return callback(util.local.get(key));
    $.ajax({
      dataType: 'JSONP',
      url: go.cfg.url+key,
      success: function(data){
        console.log('got '+util.getFileSize(data), go.apiCallCount--, 'api calls to go');
        //if (data.statuses) data.statuses = data.statuses.map(function(a){return util.twitter.simplifyObj(a);});
        callback(data);
        if (go.cfg.cache) util.local.store(key, data);
      },
      error: go.errorHandler
    });
  },
  process: function(arr) {
    console.time('process');
    var hoursRelative = 0,
        batchResponseTime = new Date() - go.apiStartTime;

    console.log('got batch in', batchResponseTime+'ms');
    
    $.each(arr, function(i, tweet){
      hoursRelative = (new Date(tweet.created_at) - go.cfg.startTime) / 3600000;
      tweet._delay = i * 20;
     
      util.tally(go.tweetStore.users, tweet.user.id_str); 

      // too old
      if (hoursRelative < -go.cfg.hoursHistory) {
        return false;
      
      // too robotic
      } else if (!util.twitter.acceptSource.test(util.parseLink(tweet.source).text)) {
        go.tweetStore.bot[tweet.id_str] = tweet;
      
      // too many retweets
      } else if (tweet.retweet_count > go.cfg.maxRetweet) {
        go.tweetStore.rt[tweet.id_str] = tweet;

      // too direct of a reply
      } else if (tweet.in_reply_to_user_id_str) {
        go.tweetStore.reply[tweet.id_str] = tweet;

      // too chatty of a user
      } else if (go.tweetStore.users[tweet.user.id_str].count - 1 > go.cfg.maxPerUser) {
        go.tweetStore.chatty[tweet.id_str] = tweet;

      // too out of bounds
      } else if (!tweet.geo) {
        go.tweetStore.nogeo[tweet.id_str] = tweet;

      // just right!
      } else {
        lex.addChunk(tweet.text, tweet.id_str);
        go.cfg.processTweet(tweet);
        go.tweetStore.ok[tweet.id_str] = tweet;
      }
    });
    console.timeEnd('process');
    go.percentDone = hoursRelative / -go.cfg.hoursHistory;
  },
  afterBatch: function() { 
    lex.afterChunks(function(word){
      return !util.isInString(word.replace(/^#/g, ''), util.getFullGeo(go.cfg.locale));
    });
    go.topArr = lex.meta.topArr;
    go.twend = lex.output.popular({maxChars: go.cfg.twendLength});
    go.cfg.afterBatch(go);
  },
  router: function(data){
    var nextPage = false;
    if (data.statuses.length) {
      go.process(data.statuses), 
      go.afterBatch(); 
      nextPage = data.search_metadata.next_results;
    }
    
    if (go.percentDone < 1 && go.apiCallCount > 0 && nextPage) {
      go.getAPI('/search/tweets', nextPage.slice(1), go.router);
    } else {
      console.timeEnd('total time');
      go.cfg.afterAll(go);
    }
  },
  errorHandler: function(err){
    $('#twend').text(JSON.stringify(err, null, 2));
    console.log('error', err);
  }
};

  go.init(args);

};

if (typeof module !== 'undefined') module.exports = Go;

