var map = {},
    marker = {},
    infoWindow = null;

var moveZone = function(zone){
  console.log('zone moved', zone);
};

var initMap = function(geocode) {
  map = new google.maps.Map(document.getElementById("map-canvas"),{
    mapTypeId: google.maps.MapTypeId.ROADMAP,
  });

  var coords = geocode.split(',');

  var delay = false, 
    zone = new google.maps.Circle({
      center: new google.maps.LatLng(coords[0], coords[1]),
      radius: parseInt(coords[2].replace('mi',''))*1600,
      strokeColor: "#FF0000",
      strokeOpacity: 0.5,
      fillColor: "#FF0000",
      fillOpacity: 0.05,
      strokeWeight: 2,
      editable: true,
      draggable: true
    });

  google.maps.event.addListener(zone, 'bounds_changed', function(){
    if (delay) window.clearTimeout(delay);
    delay = window.setTimeout(moveZone, 2000, zone);
  });

  zone.setMap(map);

  map.fitBounds(zone.getBounds());
};

var addMarker = function(data){
  var id = data.id_str,
    icon = data.user.profile_image_url,
    coords = data.geo.coordinates;

  marker[id] = new google.maps.Marker({
    position: new google.maps.LatLng(coords[0], coords[1]),
    map: map,
    icon: icon, 
    optimized: false, 
    animation: google.maps.Animation.DROP,
    _id: id
  });

  google.maps.event.addListener(marker[id], 'click', function(){
    var $elm = $('#'+id);
    if (infoWindow && typeof infoWindow.close() == 'function') infoWindow.close();
    infoWindow = new google.maps.InfoWindow({
      maxWidth: 300,
      content: $elm.find('.text').clone().addClass('infoWindow')[0]
    });
    infoWindow.open(map, marker[id]);
  });
};

var initBrowser = function(){
  var cfg = util.local.get('cfg') || {};
  
  var $out = $('#out');
  
  $('#search').val(cfg.search);
  $('#input').submit(function(e){
    e.preventDefault();
    $('#twend, .col').empty();
    cfg.search = $('#search').val();
    util.local.store('cfg', cfg);
    var outBuffer = '';
    var Twndr = new Go({
      maxRetweet: 25,
      maxPerUser: 5,
      search: cfg.search,
      afterGeo: initMap,
      processTweet: function(tweet) {
        
        if (tweet.geo) setTimeout(addMarker, tweet.fakeDelay, tweet);

        var hoursRelative = util.getHoursAgo(tweet.created_at),
            userlink = 'http://twitter.com/'+tweet.user.screen_name,
            permalink = userlink+'/status/'+tweet.id_str,
            media = tweet.entities.media;
            media = media ? '<img class="media" src="'+media[0].media_url+'">' : '',
            columns = {
              time:   hoursRelative.toFixed(1)+'h', //util.relativeTime(tweet.created_at, 3),
              fake:   tweet.fakeDelay,
              tpd:    (tweet.user.statuses_count / util.getHoursAgo(tweet.user.created_at) * 24).toFixed(1),
              followers: tweet.user.followers_count,
              RT:     tweet.retweet_count,
              image: '<a target="_blank" href="'+userlink+'" title="'+tweet.user.screen_name+': '+
                        tweet.user.description+'"><img src="'+tweet.user.profile_image_url+'"></a>',
              text:   twemoji.parse(util.hyperlinks(tweet.text)), // + media,
              source: util.removeHTML(tweet.source)
            };

        if (!$out.text()) {
          var header = {};
          $.each(columns, function(k,v){
            header[k] = k;
          });
          $out.append('<div id="thead">'+util.buildRow(header)+'</div>');
          //outBuffer += '<div id="thead">'+util.buildRow(header)+'</div>';
        }

        $out.append('<div id="'+tweet.id_str+'" class="tweet">'+util.buildRow(columns)+'</div>');
        //outBuffer += '<div id="'+tweet.id_str+'" class="tweet">'+util.buildRow(columns)+'</div>';
 
      },
      afterBatch: function(go){

        //$('#out').html(outBuffer);
        var progress = {};
        $.each(go.tweetStore, function(k,v){
          progress[k] = Object.keys(v).length;
        });
        
        $('#api').html(
          (go.percentDone*100).toFixed()+'% of history '+
          JSON.stringify(progress).replace(/[\{\}\"]/g, '').replace(/[\,\:]/g, '$& ')
        );
        
        $('#twend').html(twemoji.parse(go.twend));
        
        $('#meta').empty();
        $.each(go.topArr, function(i,v){
          var ids = v.ids, 
              idselectors = '#'+v.ids.join(', #');
          $('<li>'+twemoji.parse(v.word)+' '+v.count+'</li>').click(function(){
            $('.text .hilight').contents().unwrap();
            if ($(this).is('.hilight')) {
              $('.tweet').show();
              $('#meta .hilight').removeClass('hilight');
              
              $.each(marker, function(id,mark){
                mark.setVisible(true);
              });
            } else {
              $('#meta .hilight').removeClass('hilight');
              $(this).addClass('hilight'); 
              $('.tweet').hide().filter(idselectors).show().find('.text').html(function(i,html){
                var rgx = new RegExp('\\b'+v.word+'\\b', 'ig'); 
                return html.replace(rgx, '<span class="hilight">$&</span>');
              });
              
              $.each(marker, function(id,mark){
                mark.setVisible(ids.indexOf(id) > -1);
              });
            }
          }).appendTo('#meta');
        });
      },
      afterAll: function(go) {
        $out.delegate('.tweet', 'click', function(){
          var tweet = go.tweetStore.ok[$(this).attr('id')];
          console.log('data', tweet);
        }); 
        console.log('all done, total tweets:', Object.keys(go.tweetStore.ok).length, go.twend);
        console.log('tweetStore', go.tweetStore);
      }
    });
  }).submit();
  
  $('#cache').click(function(){
    localStorage.clear();
    $('#input').submit();
  });
};

$(document).ready(initBrowser);

