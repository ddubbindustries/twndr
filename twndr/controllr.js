var cfg = util.local.get('cfg') || {
    sets: 5, 
    lines: 1, 
    minWords: 2, 
    maxWords: 20,
    maxChars: 115,
    maxTries: 100,
    maxTime: 2000,
    lineEnd: '',
    topCount: 20,
    stats: true,
    optimize: true,
    
    maxChunks: 5000,
    timeStart: 'Tue Aug 13 22:24:22 +0000 2013',
    timeEnd: 'Fri Aug 16 13:18:44 +0000 2013',
    stream: false,
    streamInterval: 30
  },
  $input,
  $output;

var go = {
  init: function(){
    cfg = util.getConfigs() || cfg; 
    go.meta = {source: '', count: 0, dupes:0, retweets:0, replies: 0};
    
    lex.init();
  
    $input = $('#input');
    $output = $('#output');
    $refresh = $('<button/>').html('Refresh').click(go.refresh);
    $rebuild = $('<button/>').html('Rebuild').click(go.init);
    $stop = $('<button/>').html('Stop').click(go.stopStream);
    $start = $('<button/>').html('Start').click(go.startStream);
    $filter = $('<button/>').html('Filter').click(go.filterChunks);

    util.buildConfigs(cfg, function(){
      util.local.store('cfg', util.getConfigs()); 
      $refresh.click();
    });
    
    $('#configs').append($refresh, $rebuild, $stop, $start);
    
    if (util.local.get('chunks')) go.getStored(); 
    if (cfg.stream) go.startStream(cfg.streamInterval);
  },
  refresh: function(){
    var cfg = util.getConfigs();
    lex.afterChunks(cfg.topCount);
    console.log('meta', lex.meta, "\nlatest", go.meta);
    dump(lex.objToArr(lex.meta.top).map(function(v){return v.word+' '+v.count;}));
    $output.html(lex.output.format(cfg));
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
        go.processNewChunk(chunk);
      }
    });
  },
  processNewChunk: function(chunk){
    lex.chunks[chunk.id_str] = chunk;
    lex.addChunk(chunk.text);
    //return ('<p>'+chunk.created_at + ': ' + chunk.text + ' | ' + chunk.place.full_name + '</p>');
    return $('<p/>').html(chunk.created_at + ': ' + chunk.text + ' | ' + chunk.place.full_name)
      .data(chunk)
      .click(function(){
        console.log('data', $(this).data());
      });
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
        var $temp = $('<div/>'), count = 0;
        $.each(data, function(k, chunk){
          count++;
          if (go.isBadChunk(chunk)) return true;
          chunk = util.simplifyTweetObj(chunk); 
          $temp.append(go.processNewChunk(chunk));
        });
        $input.append($temp);
        
        util.local.store('chunks', lex.chunks);
        go.meta.source = 'stream';
        go.meta.count = count;
        $refresh.click();
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
        
        $refresh.click();
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
    var temp='', $temp = $('<div/>'), count = 0;
    var chunks = util.local.get('chunks');
    $.each(chunks, function(k, chunk){
      if (++count > cfg.maxChunks) return false;
      if (go.isBadChunk(chunk)) return true;
      //temp += go.processNewChunk(chunk);
      $temp.append(go.processNewChunk(chunk));
    });
    //$input.prepend(temp);
    $input.prepend($temp);
    console.timeEnd('build');
    go.meta.source = 'localStore';
    go.meta.count = count;
    $refresh.click();
  },
  finalize: function(){
    console.log('finalized');
  }
};
$(document).ready(go.init);
