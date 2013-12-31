if (typeof($) == 'undefined') $ = require('./streamr/node_modules/jquery');
if (typeof(util) == 'undefined') util = require('../lib/util.js').util;
if (typeof(lex) == 'undefined') lex = require('../lib/lexr.js').lex;
 
var cfg = util.local.get('cfg') || {
    sets: 1, 
    lines: 1, 
    minWords: 2, 
    maxWords: 20,
    maxChars: 115,
    maxTries: 100,
    maxTime: 2000,
    lineEnd: '',
    topCount: 20,
    stats: false,
    optimize: true,
    
    maxChunks: 5000,
    timeStart: 'Tue Aug 13 22:24:22 +0000 2013',
    timeEnd: 'Fri Aug 16 13:18:44 +0000 2013',
    stream: true,
    streamInterval: 30
  },
  $input,
  $output;

var go = {
  init: function(hooks){
    go.hooks = hooks;
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
    console.log('starting stream at '+seconds+'s interval');
    go.getChunks();
    if (go.activeInterval) go.stopStream();
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

var run = {
  client: function() {
    var hooks = {
      init: function(){
        console.log('client init');
        $input = $('#input');
        $output = $('#output');
        $refresh = $('<button/>').html('Refresh').click(go.refresh);
        $rebuild = $('<button/>').html('Rebuild').click(go.init);
        $stop = $('<button/>').html('Stop').click(go.stopStream);
        $start = $('<button/>').html('Start').click(go.startStream);
        $filter = $('<button/>').html('Filter').click(go.filterChunks);

        util.buildConfigs(cfg, function(){
          util.local.store('cfg', util.getConfigs()); 
          go.refresh();
        });
        
        $('#configs').append($refresh, $rebuild, $stop, $start, $filter);
      },
      process: function(chunk){
        var $p = $('<p/>').html(chunk.created_at + ': ' + chunk.text + ' | ' + chunk.place.full_name)
          .data(chunk)
          .click(function(){
            console.log('data', $(this).data());
          });
        $input.prepend($p);
      },
      refresh: function(){ 
        console.log('meta', lex.meta, "\nlatest", go.meta);
        dump(lex.objToArr(lex.meta.top).map(function(v){return v.word+' '+v.count;}));
        $output.html(lex.output.format(cfg));
      }
    };

    $(document).ready(function(){
      go.init(hooks);
    });
  },
  server: function(){
    go.init({
      init: function(){
        console.log('server init', cfg);
      },
      process: function(chunks){},
      refresh: function(){ 
        console.log('chunkCount', lex.meta.chunkCount, 'tallyCount', lex.meta.tallyCount, "\nlatest", go.meta);
        console.log('top:', lex.meta.getTopArr().join(', '));
        console.log('twip:', lex.output.format(cfg));
      },
      finalize: function(){}
    });
  }
};

if (typeof(window) == 'undefined') {
  run.server();
} else {
  run.client();
}
