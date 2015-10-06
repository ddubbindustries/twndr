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
    afterBatch: function(out){console.log('afterBatch');},
    afterAll: function(){console.log('afterAll');}
  },
  init: function(args){ 
    console.time('total time');
    lex.init();
    go.cfg.startTime = new Date().getTime();
    $.each(args || {}, function(k,v) {
      go.cfg[k] = v;
    });
    go.tweetStore = {ok: {}, bot: {}, rt: {}};
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
      go.getAPI('/search/tweets', go.cfg.api, go.router);
    }); 
  },
  getAPI: function(path, params, callback) {
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
    var out = {ok: 0, bot: 0, rt: 0, old: 0},
        hoursRelative = 0,
        okText = '';
    $.each(arr, function(i, tweet){
      hoursRelative = (new Date(tweet.created_at) - go.cfg.startTime) / 3600000;
      
      if (hoursRelative < -go.cfg.hoursHistory) {
        out.old++;
        return false;
      
      } else if (!util.twitter.acceptSource.test(util.removeHTML(tweet.source))) {
        go.tweetStore.bot[tweet.id_str] = tweet;
        out.bot++;
        return true;
      
      } else if (tweet.retweet_count > go.cfg.maxRetweet) {
        go.tweetStore.rt[tweet.id_str] = tweet;
        out.rt++;
        return true;

      } else {
        lex.addChunk(tweet.text, tweet.id_str);
        //window.setTimeout(function(){
          go.cfg.processTweet(tweet);
        //},1);
        go.tweetStore.ok[tweet.id_str] = tweet;
        out.ok++;
      }
    });
    go.afterBatch(okText); 
    return out;
  },
  afterBatch: function(okText) {
    lex.afterChunks(function(word){
      return !util.isInString(word, go.cfg.locale.replace(/\W/g, ' ').toLowerCase());
    });
    go.twend = lex.output.popular({maxChars: go.cfg.twendLength});
    go.cfg.afterBatch({
      topArr: lex.meta.topArr,
      twend: go.twend,
      text: okText
    });
  },
  router: function(data){
    console.time('process');
    var processed = go.process(data.statuses),
      nextPage = data.search_metadata.next_results;
    console.timeEnd('process');

    console.log('processed', processed);
    
    if (!processed.old && go.apiCallCount > 0 && nextPage) {
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

