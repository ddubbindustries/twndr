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
    coords = data.geo.coordinates,
    icon = new google.maps.MarkerImage(
      data.user.profile_image_url,
      new google.maps.Size(20,20),
      new google.maps.Point(0,0),
      new google.maps.Point(0,20)
    );

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


