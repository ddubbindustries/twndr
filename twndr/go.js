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
    go.tweetStore = {ok: {}, bot: {}, rt: {}, chatty: {}, users: {}};
    go.apiCallCount = go.cfg.apiMax;
    console.log('set globals go.cfg', go.cfg); 
    go.getGeo(go.cfg.search);
  },
  getGeo: function(search) {
    var parsed = util.twitter.parseQuery(search);
    go.cfg.hoursHistory = parseInt(parsed.time.replace('hr','')) || go.cfg.hoursHistory;
    go.cfg.locale = parsed.locale || go.cfg.locale;
    go.cfg.radius = parsed.distance || go.cfg.radius;
    go.getAPI('/geo/search', {query: go.cfg.locale}, function(data){
      var coords = data.result.places[0].centroid;
      go.cfg.api.geocode = [coords[1], coords[0], go.cfg.radius].join(',');
      go.cfg.afterGeo(go.cfg.api.geocode);
      go.getAPI('/search/tweets', go.cfg.api, go.router);
    }); 
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
        if (data.statuses) data.statuses = data.statuses.map(function(a){return util.twitter.simplifyObj(a);});
        callback(data);
        if (go.cfg.cache) util.local.store(key, data);
      },
      error: go.errorHandler
    });
  },
  process: function(arr) {
    console.time('process');
    var tweetTime = 0,
        hoursRelative = 0,
        firstTweetTime = new Date(arr[0].created_at),
        lastTweetTime = new Date(arr[arr.length-1].created_at),
        batchTimeRange = lastTweetTime - firstTweetTime,
        percentOfBatch = 0,
        batchCompleteTime = new Date() - go.apiStartTime,
        interpolatedTime = 0;
    console.log('got batch in', batchCompleteTime, 'ms');
    $.each(arr, function(i, tweet){
      tweetTime = new Date(tweet.created_at).getTime();
      hoursRelative = (tweetTime - go.cfg.startTime) / 3600000;
      percentOfBatch = (tweetTime - firstTweetTime) / batchTimeRange;
      interpolatedTime = (percentOfBatch * (batchCompleteTime <= 1 ? 1000: batchCompleteTime)).toFixed();

      tweet.fakeDelay = interpolatedTime * 3;
     
      util.tally(go.tweetStore.users, tweet.user.id_str); 

      if (hoursRelative < -go.cfg.hoursHistory) {
        return false;
      
      } else if (!util.twitter.acceptSource.test(util.removeHTML(tweet.source))) {
        go.tweetStore.bot[tweet.id_str] = tweet;
        return true;
      
      } else if (tweet.retweet_count > go.cfg.maxRetweet) {
        go.tweetStore.rt[tweet.id_str] = tweet;
        return true;

      } else if (go.tweetStore.users[tweet.user.id_str].count > go.cfg.maxPerUser) {
        go.tweetStore.chatty[tweet.id_str] = tweet;
        return true;

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
    go.process(data.statuses), 
    go.afterBatch(); 
    
    var nextPage = data.search_metadata.next_results;
    
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

