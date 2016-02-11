(function(){

  var creds = {
    id: 'lukedavis.3457dfcb',
    accessToken: 'pk.eyJ1IjoibHVrZWRhdmlzIiwiYSI6IjcwMDBkNWEyNmZlYzU0YTI0YTYxMGYyMmNkZjBhNjRmIn0.kd__Iir1FCZkgkrp8r-byQ'
  };

  var eid = function(){
    var count = 0;
    eid = function(){
      return "_"+(count++);
    }
    return eid();
  }

  var app = {locations:[], selectedLocationID:null, map:null};

  app.templates = {};

  app.templates.locations = function (locations) {
    return _.reduceRight(locations, function(m,n){
      var d = "";
      d += "<div class='well' data-toggle='modal' data-target='#exampleModal' data-coords='"+n.latlng.toString()+"'  data-title='"+n.title+"'  data-notes='"+n.notes+"' data-id='"+n.id+"'>"
      d += "<h3>"+n.title+"</h3>";
      d += "<div class='small' >"+n.latlng.toString()+"</div>";
      d += "<p>"+n.notes+"</p>";
      d += "</div>";
    return m + d;
    }, "<h2>Locations</h2>");
  };

  app.templates.introOverlay = function () {
    var d = '';
    d += '<div id="intro-overlay"><h1>The Starling Atlas</h1></div>';
    return d;
  };

  app.listeners = function () {

    $('#exampleModal').on('show.bs.modal', function (event) {
      app.selectedLocationID = $(event.relatedTarget).data('id');

      for (var i=0;i<app.locations.length;i++){
        if (app.locations[i].id===app.selectedLocationID){
          var latlng = app.locations[i].latlng;

          $(this).find('.modal-title').text(app.locations[i].latlng);
          $(this).find('#modal-title').val(app.locations[i].title);
          $(this).find('#modal-notes').val(app.locations[i].notes);
          app.map.panTo(latlng);
        }
      }

    })

    $("#save-location-data").on("click",function(){
      for (var i=0;i<app.locations.length;i++){
        if (app.locations[i].id===app.selectedLocationID){
          app.locations[i].title = $("#exampleModal").find('#modal-title').val();
          app.locations[i].notes = $("#exampleModal").find('#modal-notes').val();
          app.displayLocationsList(app.locations);
          break;
        }
      }
    });


  };

  app.displayIntro = function () {
    $("body").append(app.templates.introOverlay());
    $("#intro-overlay h1").textillate({
      loop: true,
      minDisplayTime: 500,
      in: {
        effect: 'fadeInUp',
        shuffle: true
      },
      out: {
        effect: 'fadeOutUp',
        shuffle: true,
        callback: function () {
          $("#intro-overlay h1").hide();
          $("#intro-overlay").fadeOut(function () {
            $(this).remove();
          });
        }
      }
    });
  };

  app.displayLocationsList = function(locations){
    $("#locations-list").html(app.templates.locations(locations));
  };

  app.displayMap = function(mapDOMElementID){
    var map = L.map('starling-map',{
      zoomControl: false,
      attributionControl: false
    }).setView([37.755817, -122.389932], 11);

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        maxZoom: 18,
        id: creds.id,
        accessToken: creds.accessToken
      }).addTo(map);

    /*
       map.on("click",function(e){
       var id = eid();
       var circle = L.circle(e.latlng, 100, {
       weight:2,
       color: '#f00',
       fillOpacity: 0
       }).addTo(map);

       circle.on("click",function(e){
       map.removeLayer(circle);
       for (var i=0;i<app.locations.length;i++){
       if (app.locations[i].mapObject===circle){
       app.locations.splice(i,1);
       break;
       }
       }
       app.displayLocationsList(app.locations);
       });

       app.locations.push({id:id, latlng:e.latlng, radius: 100, mapObject: circle, title:"Title", notes:"notes"});
       app.displayLocationsList(app.locations);

       });
       */

    app.map = map;

  };

  app.init = function(){
    app.displayMap('starling-atlas');
    app.displayIntro();
    app.listeners();
  };


  window.app = app;

})();

$(document).ready(function(){ app.init() });
