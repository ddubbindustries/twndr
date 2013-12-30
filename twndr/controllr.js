var cfg = util.local.get('cfg') || {
    sets: 5, 
    lines: 1, 
    minWords: 2, 
    maxWords: 20,
    maxChars: 115,
    maxTries: 100,
    maxTime: 2000,
    lineEnd: '',
    maxChunks: 20000,
    timeStart: "Tue Aug 13 22:24:22 +0000 2013",
    timeEnd: "Fri Aug 16 13:18:44 +0000 2013",
    stats: true,
    optimize: true,
    topCount: 15
  },
  $input,
  $output;

var go = {
  init: function(){

    cfg = util.getConfigs() || cfg;
    
    go.meta = {};
    
    lex.init();
  
    $input = $('#input');
    $output = $('#output');
    
    $refresh = $('<button/>').html('Refresh').click(function(){
      var cfg = util.getConfigs();
      lex.afterChunks(cfg.topCount);
      console.log('meta', lex.meta);
      dump(lex.objToArr(lex.meta.top).map(function(v){return v.word+' '+v.count;}));
      $output.html(lex.output.format(cfg));
    });

    $rebuild = $('<button/>').html('Rebuild').click(function(){
      go.init();
    });

    util.buildConfigs(cfg, function(){
      util.local.store('cfg', util.getConfigs()); 
      $refresh.click();
    });
    
    $('#configs').append($refresh, $rebuild);

    go.getChunks();

  },
  getChunks: function(){
    go.meta = {duplicates:0, retweets:0, replies: 0, outOfTimeRange: 0, outOfTimeArr: []};

    if (util.local.get('chunks')) {
      go.getStored();
    } else {
      go.getApi();
    }
  },
  isBadChunk: function(chunk){
    if (lex.chunks[chunk.id_str]) return go.meta.duplicates++;
    if (chunk.retweet_count > 0) return go.meta.retweets++;
    if (chunk.in_reply_to_user_id_str) return go.meta.replies++;
    if (!go.isInTimeRange(chunk.created_at, cfg.timeStart, cfg.timeEnd)) {
      go.meta.outOfTimeArr.push(chunk);
      return go.meta.outOfTimeRange++;
    }
    return false;
  },
  isInTimeRange: function(time, low, high){
    var t = new Date(time);
    return t >= new Date(low) && t <= new Date(high);
  },
  getApi: function(startTime) {
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
        console.log('this chunk set', go.meta);
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
      lex.chunks[chunk.id_str] = chunk;
      lex.addChunk(chunk.text);
      input += (chunk.created_at + ': ' + chunk.text+"\n\n");
    });
    $input.append(input);
    $refresh.click();
    go.finalize();
  },
  finalize: function(){
    console.log('got all chunks', go.meta);
  }
};
$(document).ready(function(){
  go.init();
});
