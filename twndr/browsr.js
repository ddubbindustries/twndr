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
    dump(lex.meta.topArr);
    $output.html(lex.output.format(cfg));
  },
  finalize: function(){
    console.log('final hook');
  }
};

$(document).ready(function(){
  go.init(hooks);
});

