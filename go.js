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
    apiMax: 20,
    cache: true,
    maxRetweet: 10,
    maxPerUser: 10,
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
    go.cfg.startTime = new Date().getTime();
    $.each(args || {}, function(k,v) {
      go.cfg[k] = v;
    });
    go.tweetsRaw = util.local.get(go.cfg.api.geocode) || {statuses:[]};
    go.tweetsProc = {raw: {}, ok: {}, bot: {}, rt: {}, reply: {}, chatty: {}, nogeo: {}};

    go.freq = {
      words: new Lex(),
      users: new Lex(),
      sources: new Lex()
    };

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
  parseSearch: function(text) {
    var parsed = {
      locale: util.safeMatch(/[a-z\s\.]{2,}\,\s?[a-z]{2,}/i, text),
      distance: util.safeMatch(/[0-9]{1,}(mi|km)/, text),
      time: util.safeMatch(/[0-9]{1,}hr/, text)
    };
    go.cfg.hoursHistory = parseInt(parsed.time.replace('hr','')) || go.cfg.hoursHistory;
    go.cfg.locale = parsed.locale || go.cfg.locale;
    go.cfg.radius = parsed.distance || go.cfg.radius;
  },
  getGeo: function(locale, success) {
    if (typeof getGoogleCoords == 'function') {
      getGoogleCoords(locale, function(data){
        var coords = data[0].geometry.location;
        go.cfg.fullGeo = util.getFullGeo(data[0].address_components);
        success([coords.lng(), coords.lat()]);
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
    console.time('get'); console.log('getting', key);

    //if (go.cfg.cache && localStorage && localStorage[go.cfg.api.geocode]) return callback(util.local.get(go.cfg.api.geocode));
    if (go.cfg.cache && localStorage && localStorage[key]) return callback(util.local.get(key));
    $.ajax({
      dataType: 'JSONP',
      url: go.cfg.url+key,
      success: function(data){
        console.log('got '+util.getFileSize(data), go.apiCallCount--, 'api calls to go');
        //if (data.statuses) data.statuses = data.statuses.map(function(a){return util.twitter.simplifyObj(a);});
        callback(data);
        //go.tweetsRaw.search_metadata = data.search_metadata,
        //go.tweetsRaw.statuses = go.tweetsRaw.statuses.concat(data.statuses)
        if (go.cfg.cache) util.local.store(key, data);
      },
      error: go.errorHandler
    });
  },
  process: function(arr) {
    var tweetTime = 0,
        hoursRelative = 0,
        firstTweetTime = new Date(arr[0].created_at),
        lastTweetTime = new Date(arr[arr.length-1].created_at),
        batchTimeRange = lastTweetTime - firstTweetTime,
        percentOfBatch = 0,
        batchResponseTime = new Date() - go.apiStartTime,
        interpolatedTime = 0;

    console.timeEnd('get');
    console.time('process');

    $.each(arr, function(i, tweet){
      tweetTime = new Date(tweet.created_at).getTime();
      hoursRelative = (tweetTime - go.cfg.startTime) / 3600000;
      percentOfBatch = (tweetTime - firstTweetTime) / batchTimeRange;
      interpolatedTime = (percentOfBatch * batchResponseTime).toFixed();

      tweet._delay = interpolatedTime * 3;

      // too old
      if (hoursRelative < -go.cfg.hoursHistory) {
        return false;
      } else {
        go.tweetsProc.raw[tweet.id_str] = tweet;
      }

      // too robotic
      if (!util.twitter.acceptSource.test(util.parseLink(tweet.source).text)) {
        go.tweetsProc.bot[tweet.id_str] = tweet;

      // too many retweets
      } else if (tweet.retweet_count > go.cfg.maxRetweet) {
        go.tweetsProc.rt[tweet.id_str] = tweet;

      // too direct of a reply
      } else if (tweet.in_reply_to_user_id_str) {
        go.tweetsProc.reply[tweet.id_str] = tweet;

      // too chatty of a user
      } else if (
        go.freq.users.list['@'+tweet.user.screen_name] &&
        go.freq.users.list['@'+tweet.user.screen_name].count >= go.cfg.maxPerUser
      ) {
        go.tweetsProc.chatty[tweet.id_str] = tweet;

      // too out of bounds
      } else if (!tweet.geo) {
        go.tweetsProc.nogeo[tweet.id_str] = tweet;

      // just right!
      } else {
        go.freq.words.addChunk(tweet.text, tweet.id_str);
        go.freq.users.tally('@'+tweet.user.screen_name, tweet.id_str, tweet.user);
        go.freq.sources.tally(tweet.source, tweet.id_str);

        go.cfg.processTweet(tweet);
        go.tweetsProc.ok[tweet.id_str] = tweet;
      }
    });
    go.percentDone = hoursRelative / -go.cfg.hoursHistory;
  },
  router: function(data){
    if (data.statuses.length) {
      go.process(data.statuses),
      go.afterBatch();
    }

    var nextPage = data.search_metadata ? data.search_metadata.next_results : false;

    if (go.percentDone < 1 && go.apiCallCount > 0 && nextPage) {
      go.getAPI('/search/tweets', nextPage.slice(1), go.router);
    } else {
      go.afterAll();
    }
  },
  afterBatch: function() {
    go.freq.words.topArr = go.freq.words.getTop(function(v){
      return v.count > 1 &&
        !util.isCommon(v.word) &&
        !/^@/.test(v.word) &&
        !util.isInString(v.word, util.getFullGeo(go.cfg.locale));
    });
    go.freq.users.topArr = go.freq.users.getTop();
    go.freq.sources.topArr = go.freq.sources.getTop();
    go.freq.hashes = {};
    go.freq.hashes.topArr = go.freq.words.topArr.filter(function(a){
      return /^#/.test(a.word);
    });

    go.twend = go.freq.words.getTopSeries(go.freq.words.topArr, go.cfg.twendLength);
    console.timeEnd('process');
    go.cfg.afterBatch(go);
  },
  afterAll: function() {
    console.timeEnd('total time');
    go.cfg.afterAll(go);
    //if (go.cfg.cache && go.tweetsRaw.statuses.length) util.local.store(go.cfg.api.geocode, go.tweetsRaw);
  },
  errorHandler: function(err){
    $('#twend').text(JSON.stringify(err, null, 2));
    console.log('error', err);
  }
};

  go.init(args);

};

if (typeof module !== 'undefined') module.exports = Go;
