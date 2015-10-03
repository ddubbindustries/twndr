var initBrowser = function(){
  var cfg = util.local.get('cfg') || {};
  
  var $out = $('#out');
  
  $('#search').val(cfg.search);
  $('#input').submit(function(e){
    e.preventDefault();
    $('#twend, .col').empty();
    cfg.search = $('#search').val();
    util.local.store('cfg', cfg);
    var Twndr = new Go({
      search: cfg.search,
      processTweet: function(tweet) {
            
        var hoursRelative = util.getHoursAgo(tweet.created_at),
            userlink = 'http://twitter.com/'+tweet.user.screen_name,
            permalink = userlink+'/status/'+tweet.id_str,
            media = tweet.entities.media;
            media = media ? '<br><img clas="media" src="'+media[0].media_url+'">' : '';

        $out.prepend(
          '<div id="'+tweet.id_str+'" class="tweet">'+
          util.buildRow({
            time:   hoursRelative.toFixed(1)+'h', //util.relativeTime(tweet.created_at, 3),
            source: util.removeHTML(tweet.source),
            tweets_per_day: (tweet.user.statuses_count / util.getHoursAgo(tweet.user.created_at) * 24).toFixed(1),
            followers: tweet.user.followers_count,
            RT:     tweet.retweet_count,
            image: '<a target="_blank" href="'+userlink+'" title="'+tweet.user.screen_name+': '+
                      tweet.user.description+'"><img src="'+tweet.user.profile_image_url+'"></a>',
            text:   twemoji.parse(util.hyperlinks(tweet.text)) //+ media
          }) + '</div>'
        );
 
      },
      afterBatch: function(out){

        //$('#out').append(out.text);
        $('#twend').html(twemoji.parse(out.twend));
        
        $('#meta').empty();
        $.each(out.topArr, function(i,v){
          var idselectors = '#'+v.ids.join(', #');
          $('<li>'+twemoji.parse(v.word)+' '+v.count+'</li>').click(function(){
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
        $out.delegate('.tweet', 'click', function(){
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

