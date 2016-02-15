var template = function () {
  var d = '';
  d += '<div id="intro-overlay"><h1>The Starling Atlas</h1></div>';
  return d;
};

var intro = function () {
  $("body").append(template());
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

module.exports = intro;
