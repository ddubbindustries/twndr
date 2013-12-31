var cfg = require('./cfg.js').cfg,
    go = require('./controllr.js').go;

go.init({
  init: function(){
    console.log('server init', cfg);
  },
  process: function(chunks){},
  refresh: function(){ 
    console.log('chunkCount', lex.meta.chunkCount, 'tallyCount', lex.meta.tallyCount, "\nlatest", go.meta);
    console.log('top:', lex.meta.topArr.slice(0, cfg.topCount).join(', '));
    console.log('twip:', lex.output.format(cfg));
  },
  finalize: function(){}
});

