var sampleEquation = '\\frac{\\pi}{2} = \\int_{-1}^{1} \\sqrt{1-x^2}\\ dx';
var hasShownBefore = false;

var ENDPOINT = '/convert';

$(document).ready(function() {
  function show(resultData) {
    function afterSlideUp() {
      var resultDataJSON;
      try {
        resultDataJSON = typeof resultData === 'string' ? JSON.parse(resultData) : resultData;
      } catch (e) {
        resultDataJSON = { error: 'Invalid response received from server' };
      }

      if (resultDataJSON && !resultDataJSON.error) {
        var format = ($('#outputFormatSelect').val() || 'PNG').toUpperCase();
        var fullImageUrl = window.location.origin + '/' + resultDataJSON.imageURL;

        // Render preview image
        $('#resultImage').attr('src', resultDataJSON.imageURL);
        $('#downloadButton').attr('href', resultDataJSON.imageURL);
        $('#downloadButton').attr('download', 'equation.' + format.toLowerCase());
        $('#openNewTabButton').attr('href', fullImageUrl);
        $('#formatBadge').text(format);

        // Populate text boxes
        $('#imageUrlInput').val(fullImageUrl);
        $('#svgCodeTextarea').val(resultDataJSON.svgContent || '');
        $('#markdownInput').val('![LaTeX Equation](' + fullImageUrl + ')');

        $('#resultCard').show();
        $('#errorAlert').hide();
      } else {
        $('#errorAlert').text((resultDataJSON && resultDataJSON.error) || 'Invalid response received');
        $('#errorAlert').show();
        $('#resultCard').hide();
      }

      $('#result').slideDown(330);

      // Scroll window to result card
      $('html, body').animate({
        scrollTop: $('#result').offset().top - 20
      }, 600);

      hasShownBefore = true;
    }

    $('#result').slideUp(hasShownBefore ? 330 : 0, afterSlideUp);
  }

  $('#convertButton').click(function() {
    var latexInput = $('#latexInputTextArea').val();

    if (!latexInput) {
      show({ error: 'No LaTeX input provided.' });
      return;
    }

    if ($('#autoAlignCheckbox').prop('checked')) {
      latexInput = '\\begin{align*}\n' + latexInput + '\\end{align*}\n';
    }

    $('#result').slideUp(hasShownBefore ? 330 : 0, function() {
      $('#resultImage').attr('src', '');
    });

    $('#convertButton').prop('disabled', true);
    $('#exampleButton').prop('disabled', true);
    $('#convertButtonText').html('Converting...');
    $('#convertSpinner').removeClass('d-none');

    $.ajax({
      url: ENDPOINT,
      type: 'POST',
      data: {
        latexInput: latexInput,
        outputFormat: $('#outputFormatSelect').val(),
        outputScale: $('#outputScaleSelect').val()
      },
      success: function(data) {
        $('#convertButton').prop('disabled', false);
        $('#exampleButton').prop('disabled', false);
        $('#convertButtonText').html('Convert');
        $('#convertSpinner').addClass('d-none');
        show(data);
      },
      error: function() {
        $('#convertButton').prop('disabled', false);
        $('#exampleButton').prop('disabled', false);
        $('#convertButtonText').html('Convert');
        $('#convertSpinner').addClass('d-none');
        alert('Error communicating with server');
      }
    });
  });

  // Show and convert a sample equation
  $('#exampleButton').click(function() {
    $('#latexInputTextArea').val(sampleEquation);
    $('#autoAlignCheckbox').prop('checked', true);
    $('#convertButton').click();
  });

  // Copy buttons handler
  $(document).on('click', '.copy-btn', function() {
    var $btn = $(this);
    var targetSelector = $btn.data('target');
    var $target = $(targetSelector);
    var textToCopy = $target.val();

    if (!textToCopy) return;

    var originalText = $btn.text();

    function onCopied() {
      $btn.text('Copied!').addClass('copied');
      setTimeout(function() {
        $btn.text(originalText).removeClass('copied');
      }, 2000);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textToCopy).then(onCopied).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      $target.select();
      try {
        document.execCommand('copy');
        onCopied();
      } catch (err) {
        console.error('Copy fallback failed', err);
      }
    }
  });

  // Ensure tab switching works properly
  $('#exportTabs a').click(function(e) {
    e.preventDefault();
    $(this).tab('show');
  });
});
