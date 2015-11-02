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
    twendLength: 140,
    afterGeo: function(){console.log('afterGeo');},
    processTweet: function(tweet) {console.log('tweet', tweet.text);},
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
    go.stats = {};

    go.freq = {
      words: new Lex(),
      digrams: new Lex(),
      users: new Lex(),
      sources: new Lex()
    };

    go.twend = 'no tweets found';
    go.apiCount = 0;
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
        console.log('got '+go.apiCount+' of '+go.cfg.apiMax+' from API', util.getFileSize(data), data);
        //if (data.statuses) data.statuses = data.statuses.map(function(a){return util.twitter.simplifyObj(a);});
        callback(data);
        //go.tweetsRaw.search_metadata = data.search_metadata,
        //go.tweetsRaw.statuses = go.tweetsRaw.statuses.concat(data.statuses)
        if (go.cfg.cache) util.local.store(key, data);
      },
      error: go.errorHandler
    });
  },
  router: function(data){
    if (data.statuses.length) {
      go.process(data.statuses);
      go.stats.rateLimit = data.rate_limit.remaining;
      go.afterBatch();
    }

    var nextPage = data.search_metadata ? data.search_metadata.next_results : false;
    if (!nextPage) console.log('no next page :(');
    if (go.stats.percentDone < 1 && go.apiCount++ < go.cfg.apiMax && nextPage) {
      go.getAPI('/search/tweets', nextPage.slice(1), go.router);
    } else {
      go.afterAll();
    }
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

        tweet._tokens = go.freq.words.tokenize(tweet.text);

        tweet._digrams = tweet._tokens
          .map(function(v,k,arr){
            if (arr[k+1] && !(util.isCommon(v) || util.isCommon(arr[k+1]))) return v+' '+arr[k+1];
          })
          .filter(function(v){return v;});

        go.freq.words.addChunk(tweet._tokens, tweet.id_str, tweet.user.id_str);
        go.freq.digrams.addChunk(tweet._digrams, tweet.id_str, tweet.user.id_str);
        go.freq.users.tally('@'+tweet.user.screen_name, tweet.id_str, tweet.user.id_str, tweet.user);
        go.freq.sources.tally(tweet.source, tweet.id_str, tweet.id_str);

        go.cfg.processTweet(tweet);
        go.tweetsProc.ok[tweet.id_str] = tweet;
      }
    });
    go.stats.percentDone = hoursRelative / -go.cfg.hoursHistory;
  },
  afterBatch: function() {

    var wordFilter = function(k,v){
      return v.count > 1
        && !util.isCommon(k)
        && !/^@/.test(k)
        && !util.isInString(k.replace(/^\#/,''), go.cfg.fullGeo);
    };

    go.freq.users.setTop();
    go.freq.sources.setTop();

    go.freq.emoji = $.extend(true, {}, go.freq.words);
    go.freq.emoji.permaFilter(function(k,v){
      return wordFilter(k,v) && k.length <= 2 && util.emojiRgx.test(k);
    }).setTop();

    go.freq.combos = $.extend(true, {}, go.freq.words);
    go.freq.combos.permaFilter(wordFilter);

    $.each(go.freq.combos.list, function(word, v) {
      $.each([
        util.form.plural(word),
        util.form.past(word),
        util.form.continuous(word),
        util.form.more(word),
        '#'+word
      ], function(i, wordForm) {
        go.freq.combos.mergeTokens(wordForm, word, 3);
      });
    });

    go.freq.digrams.permaFilter(wordFilter);
    go.freq.combos.featherList(go.freq.digrams.list);

    go.freq.combos.setTop();
    go.freq.digrams.setTop();

    go.twendArr = go.freq.combos.topArr;
    go.twend = go.freq.words.getTopSeries(go.twendArr, go.cfg.twendLength);

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
