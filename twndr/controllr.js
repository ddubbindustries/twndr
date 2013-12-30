var cfg = util.local.get('cfg') || {
    sets: 5, 
    lines: 1, 
    minWords: 2, 
    maxWords: 20,
    maxChars: 115,
    maxTries: 100,
    maxTime: 2000,
    lineEnd: '',
    maxChunks: 2000,
    updateInterval: 60,
    timeStart: 'Tue Aug 13 22:24:22 +0000 2013',
    timeEnd: 'Fri Aug 16 13:18:44 +0000 2013',
    stats: true,
    optimize: true,
    topCount: 20
  },
  $input,
  $output;

var go = {
  init: function(){
    cfg = util.getConfigs() || cfg; 
    go.meta = {duplicates:0, retweets:0, replies: 0, outOfTimeRange: 0, outOfTimeArr: []};
    
    lex.init();
  
    $input = $('#input');
    $output = $('#output');
    $refresh = $('<button/>').html('Refresh').click(go.refresh);
    $rebuild = $('<button/>').html('Rebuild').click(go.init);

    util.buildConfigs(cfg, function(){
      util.local.store('cfg', util.getConfigs()); 
      $refresh.click();
    });
    
    $('#configs').append($refresh, $rebuild);
    
    if (util.local.get('chunks')) {
      go.getStored();
    } else {
      go.getChunks();
    }
    go.getStream(cfg.updateInterval);
  },
  refresh: function(){
    var cfg = util.getConfigs();
    lex.afterChunks(cfg.topCount);
    console.log('meta', lex.meta, go.meta);
    dump(lex.objToArr(lex.meta.top).map(function(v){return v.word+' '+v.count;}));
    $output.html(lex.output.format(cfg));
  },
  getStream: function(seconds){
    console.log('starting stream at '+seconds+'s interval');
    if (go.activeInterval) clearInterval(go.activeInterval);
    go.activeInterval = setInterval(go.getChunks, seconds * 1000);
  },
  getChunks: function(){
    if (lex.meta.chunkCount < cfg.maxChunks) {
      go.getApi();
    } else {
      clearInterval(go.activeInterval);
      go.finalize();
    }
  },
  processChunk: function(chunk){
    lex.chunks[chunk.id_str] = chunk;
    lex.addChunk(chunk.text);
    return (chunk.created_at + ': ' + chunk.text + ' | ' + chunk.place.full_name + "\n\n");
  },
  isBadChunk: function(chunk){
    if (lex.chunks[chunk.id_str]) return go.meta.duplicates++;
    if (chunk.retweet_count > 0) return go.meta.retweets++;
    if (chunk.in_reply_to_user_id_str) return go.meta.replies++;
    /*if (!go.isInTimeRange(chunk.created_at, cfg.timeStart, cfg.timeEnd)) {
      go.meta.outOfTimeArr.push(chunk);
      return go.meta.outOfTimeRange++;
    }*/
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
        var input = '';
        $.each(data, function(k, chunk){
          if (go.isBadChunk(chunk)) return true;
          chunk = util.simplifyTweetObj(chunk); 
          input += go.processChunk(chunk);
        });
        $input.prepend(input+"====================\n\n");
        
        util.local.store('chunks', lex.chunks);
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
    var input = '', count = 0;
    var chunks = util.local.get('chunks');
    $.each(chunks, function(k, chunk){
      if (++count > cfg.maxChunks) return false;
      if (go.isBadChunk(chunk)) return true;
      input += go.processChunk(chunk);
    });
    $input.prepend(input);
    $refresh.click();
  },
  finalize: function(){
    console.log('finalized');
  }
};
$(document).ready(go.init);
