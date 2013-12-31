if (typeof(window) == 'undefined') {
  $ = require('./streamr/node_modules/jquery');
  LocalStorage = require('./streamr/node_modules/node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./localStore');
  util = require('../lib/util.js').util;
  lex = require('../lib/lexr.js').lex;
  cfg = require('./cfg.js').cfg;
}

var go = {
  init: function(hooks){
    go.hooks = go.hooks || hooks;
    cfg = util.getConfigs() || cfg; 
    go.meta = {source:'', count:0, dupes:0, retweets:0, replies: 0};
    
    lex.init();
    go.hooks.init();

    if (util.local.get('chunks')) go.getStored(); 
    if (cfg.stream) go.startStream(cfg.streamInterval);
  },
  refresh: function(){
    var cfg = util.getConfigs();
    lex.afterChunks(cfg.topCount);
    go.hooks.refresh();
  },
  startStream: function(){
    var seconds = cfg.streamInterval;
    go.getChunks();
    if (go.activeInterval) go.stopStream();
    console.log('starting stream at '+seconds+'s interval');
    go.activeInterval = setInterval(go.getChunks, seconds * 1000);
  },
  stopStream: function(){
    console.log('stopping stream');
    clearInterval(go.activeInterval); 
  },
  getChunks: function(){
    if (lex.meta.chunkCount < cfg.maxChunks) {
      go.getApi();
    } else {
      clearInterval(go.activeInterval);
      go.finalize();
    }
  },
  filterChunks: function(opts){
    var cachedChunks = lex.chunks;
    lex.init();
    $.each(cachedChunks, function(k,chunk){
      if (go.isInTimeRange(chunk.created_at, cfg.timeStart, cfg.timeEnd)) {
        go.process(chunk);
      }
    });
    go.refresh();
  },
  process: function(chunk){
    lex.chunks[chunk.id_str] = chunk;
    lex.addChunk(chunk.text);
    go.hooks.process(chunk);
  },
  isBadChunk: function(chunk){
    if (lex.chunks[chunk.id_str]) return go.meta.duplicates++;
    if (chunk.retweet_count > 0) return go.meta.retweets++;
    if (chunk.in_reply_to_user_id_str) return go.meta.replies++;
    // if (!go.isInTimeRange(chunk.created_at, cfg.timeStart, cfg.timeEnd)) return go.meta.outOfTimeRange++;
    return false;
  },
  isInTimeRange: function(time, low, high){
    var t = new Date(time);
    return t >= new Date(low) && t <= new Date(high);
  },
  getApi: function(cfg) {
    $.ajax({
      url: 'http://p.ddubb.net:8080', 
      dataType: 'jsonp',
      success: function(data){
        var count = 0;
        $.each(data, function(k, chunk){
          count++;
          if (go.isBadChunk(chunk)) return true;
          chunk = util.simplifyTweetObj(chunk); 
          go.process(chunk);
        }); 
        util.local.store('chunks', lex.chunks);
        go.meta.source = 'stream';
        go.meta.count = count;
        go.refresh();
      }
    });
  },
  getDbApi: function(startTime) {
    $.ajax({
      url: 'http://p.ddubb.net/db/', 
      data: {table: 'tweets', time: startTime+',', limit: 5000},
      dataType: 'jsonp',
      cache: true,
      success: function(data){
        var input = '', nextTime = 0;
        $.each(data.results, function(k,v){
          var chunk = JSON.parse(v.data);
          if (go.isBadChunk(chunk)) return true;

          chunk = util.simplifyTweetObj(chunk);

          input += (chunk.created_at + ': ' + chunk.text+"\n\n");
          lex.chunks[chunk.id_str] = chunk;
          lex.addChunk(chunk.text);
          nextTime = v.time;
        });
        $input.append(input+"====================\n\n\n");
        util.local.store('chunks', lex.chunks);
        
        go.refresh();
        if (lex.meta.chunkCount < cfg.maxChunks) {
          go.getApi(nextTime);
        } else {
          go.finalize();
        }
      }
    });
  },
  getStored: function(){
    console.time('build');
    var count = 0;
    var chunks = util.local.get('chunks');
    $.each(chunks, function(k, chunk){
      if (++count > cfg.maxChunks) return false;
      if (go.isBadChunk(chunk)) return true;
      go.process(chunk);
    });
    console.timeEnd('build');
    go.meta.source = 'localStore';
    go.meta.count = count;
    go.refresh();
  },
  finalize: function(){
    console.log('finalized');
  }
};

if (typeof exports !== 'undefined') exports.go = go;
