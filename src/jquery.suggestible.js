(function($) {
  $.fn.suggestible = function (options) {
    var defaults = {
      source: [],
      delay: 0,
      minLength: 1,
      extractSearchTerms: function (suggestion) {
        return suggestion;
      },
      formatSuggestion: function (suggestion, search_term) {
        return suggestion;
      },
      rejectSelected: function (suggestions) {
        return suggestions;
      },
      extractSearchTerms: function (value) {
        return value.title || value.name || value.label || value.value || value;
      },
      onSelect: $.noop
    };
    var options = $.extend(defaults, options);
    var source;

    function escapeRegex(value) {
      return value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }
    
    function filter(array, term) {
      var matcher = new RegExp(escapeRegex(term), "i");
      return $.grep(array, function(value) {
        return matcher.test( options.extractSearchTerms(value) );
      });
    }

    (function initSource() {
      if ($.isArray(options.source)) {
        source = function(terms, callback) {
          callback(options.source);
        };
      } else {
        source = options.source;
      }
    })();

    return this.each(function() {
      $this = $(this);
      var id = $(this).attr('id');
      var lastSearch = false;
      var search_timeout;
      var closing_timeout;
      var suggestionsActive = false;

      // Setup HTML
      $this.attr("autocomplete","off").addClass("suggestible-input").val(options.startText);
      var $results_holder = $('<div class="suggestible-results" id="suggestible-results-' + id + '"></div>').hide();
      var $results_ul =  $('<ul class="suggestible-list"></ul>');
      $results_holder.html($results_ul);
      $this.after($results_holder);
      
      function search(term, callback) {
        lastSearch = $this.val();

        if ( term.length < options.minLength ) {
          clearSearch();
          return hideSuggestions(true);
        }

        $this.addClass('loading');
        source(term, function (results) {
          var suggestions = options.rejectSelected(filter(results, term));
          $this.removeClass('loading');
          callback(suggestions, term);
        });
      }

      function loadSuggestions (suggestions, term) {
        $results_ul.html("");
        $.each(suggestions, function (index, item) {
          var suggestionHolder = $('<li class="suggestible-item" id="suggestible-item-' + index + '"></li>').data('item', item);
          suggestionHolder.html(options.formatSuggestion(item, term));
          $results_ul.append(suggestionHolder);
        });
        showSuggestions();
        moveSelection('down');
      }

      function showSuggestions () {
        $results_ul.css("width", $this.outerWidth());
        $results_holder.show();
        suggestionsActive = true;
      }
      
      function hideSuggestions () {
        clearTimeout(closing_timeout);
        $results_holder.hide();
        suggestionsActive = false;
      }

      function selectActive () {
        var raw_data = $("li.active", $results_ul).data("item");
        hideSuggestions();
        clearSearch();
        options.onSelect(raw_data);
      }
      
      function clearSearch () {
        lastSearch = null;
        $this.val(null);
        $results_ul.html("");
      }

      function moveSelection (direction) {
        if ($(":visible",$results_holder).length > 0) {
          var lis = $("li", $results_holder);
          var start = (direction == "down") ? lis.eq(0) : lis.filter(":last");
          var active = $("li.active:first", $results_holder);
          if (active.length > 0) {
            start = (direction == "down") ? active.next() : active.prev();
          }
          lis.removeClass("active");
          start.addClass("active");
        }
      }

      $this
        .focus(function () {
          if ($results_ul.html() !== "") {
            showSuggestions();
          }
        })
        .blur(function () {
          clearTimeout(search_timeout);
          closing_timeout = setTimeout(hideSuggestions, 10);
        })
        .keydown(function (e) {
          switch(e.keyCode) {
          case 38:
            moveSelection('up');
            e.preventDefault();
            break;
          case 40:
            moveSelection('down');
            e.preventDefault();
            break;
          case 13:
          case 9:
            if (suggestionsActive) {
              e.preventDefault();
              selectActive();
            }
          case 27:
            hideSuggestions();
            e.preventDefault();
            break;
          default:
            clearTimeout( search_timeout );
            search_timeout = setTimeout(function() {
              // only search if the value changed
              if ( lastSearch != $this.val() ) {
                search($this.val(), loadSuggestions);
              }
            }, options.delay );
            break;
          }
        });
      
        $('#suggestible-results-' + id + ' .suggestible-item')
          .live('click', selectActive)
          .live('mouseover', function () {
            $("li", $results_ul).removeClass("active");
            $(this).addClass("active");
          });
    });
    
  };
})(jQuery);
