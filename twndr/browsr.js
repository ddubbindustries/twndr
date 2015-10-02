var initBrowser = function(){
  var cfg = util.local.get('cfg') || {};
  $('#search').val(cfg.search);
  $('#input').submit(function(e){
    e.preventDefault();
    $('#twend, .col').empty();
    cfg.search = $('#search').val();
    util.local.store('cfg', cfg);
    var Twndr = new Go({
      search: cfg.search,
      afterBatch: function(out){

        $('#out').append(out.text);

        $('#twend').text(out.twend);
        $('#meta').empty();
        $.each(out.topArr, function(i,v){
          var idselectors = '#'+v.ids.join(', #');
          $('<li>'+v.word+' '+v.count+'</li>').click(function(){
            if ($(this).is('.hilight')) {
              $('.tweet').show();
              $('#meta .hilight').removeClass('hilight');
            } else {
              $('#meta .hilight').removeClass('hilight');
              $(this).addClass('hilight'); 
              $('.text .hilight').contents().unwrap();
              $('.tweet').hide().filter(idselectors).show().find('.text').html(function(i,html){
                return html.replace(new RegExp('\\b'+v.word+'\\b', 'ig'), '<span class="hilight">$&</span>');
              });
            }
          }).appendTo('#meta');
        });
        $('<li>[ALL]</li>').hover(function(){$('#out li').show();}).appendTo('#meta');
      },
      afterAll: function(go) {
        $('.tweet').click(function(){
          console.log(go.tweetStore.ok[$(this).attr('id')]);
        }); 
        console.log('all done, total tweets:', Object.keys(go.tweetStore.ok).length, go.twend);
      }
    });
  }).submit();
  
  $('#cache').click(function(){
    localStorage.clear();
    $('#input').submit();
  });
};

$(document).ready(initBrowser);

