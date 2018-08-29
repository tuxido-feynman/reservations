import $ from 'jquery';
import 'bootstrap';
import './app.scss';


////Search initialization
var algoliasearch = require('algoliasearch');
var algoliasearchHelper = require('algoliasearch-helper');
var autocomplete = require('autocomplete.js')

var indexName = 'test_restaurants_000';
var client = algoliasearch('AEJELR546O', '3be00e707f27e7bad9357f293445bac7');
var index = client.initIndex(indexName);
var helper = algoliasearchHelper(client, indexName, {
  disjunctiveFacets: ['starts_count', 'food_type', 'payment_options'],
  hitsPerPage: 3,
  aroundLatLngViaIP: true
});
var discoverCards = ['Discover', 'Carte Blanche', 'Diners Club']
var maxRating = 5

autocomplete('#location-box',
{ hint: false }, {
    source: autocomplete.sources.hits(index, {hitsPerPage: 1}),
    //value to be displayed in input control after user's suggestion selection
    displayKey: 'city',
    //hash of templates used when rendering dataset
    templates: {
        //'suggestion' templating function used to render a single suggestion
        suggestion: function(suggestion) {
          return '<span>' +
            suggestion.city + '</span><span>';
        }
    }
});

////ratings
function composeRatings(numStars, addCount = false, numReviews = 0) {
  let ratingRow = $('<div class="rating">').data('rating', numStars);
  if (addCount) {
    ratingRow.append($('<span class=star-rating>').html(numStars + '  '));
  }
  numStars = Math.round(numStars*2)/2;
  let halfStars = 0
  if (numStars % 1 !== 0) {
    numStars = numStars - 0.5
    halfStars = 1
  }
  for (let i = 0; i < numStars; i++) {
    ratingRow.append($('<i class="fa fa-star star-full" aria-hidden="true">'));
  }
  for (let i = 0; i< halfStars; i++) {
    ratingRow.append($('<i class="fa fa-star-half star-half-full" aria-hidden="true">'));
  }
  for (let i=0; i < maxRating - numStars; i++) {
    ratingRow.append($('<i class="fa fa-star star-empty" aria-hidden="true">'));
  }
  if (addCount) {
    ratingRow.append($('<span>').html(' (' + numReviews + ' reviews)'));
  }
  return ratingRow
}

function buildRatingsMenu(ratingItems, maxRating) {
  for (var i = 1; i < maxRating + 1; i++) {
    ratingItems.append(composeRatings(i));
  }
}

buildRatingsMenu($('#rating-items'), maxRating);


////facet-item select
function renderFacetList(content) {
  $('#food-type-items').html(function() {
    return $.map(content.getFacetValues('food_type'), function(facet) {
      return buildFacetItem('food-type-item', facet);
    });
  });

  let facetValues = content.getFacetValues('payment_options');
  let discoverFacet = {name: 'Discover', count: 0, isRefined: false};
  let facets = [discoverFacet];
  for (let i = 0; i < facetValues.length; i++) {
    if (discoverCards.includes(facetValues[i].name)) {
      discoverFacet.count = discoverFacet.count + facetValues[i].count;
      discoverFacet.isRefined = discoverFacet.isRefined || facetValues[i].isRefined;
    } else {
      facets.push(facetValues[i]);
    }
  }
  facets.sort(function(a,b) {return (a.count < b.count) ? 1 : ((b.count < a.count) ? -1 : 0);} );
  $('#payment-items').html(function() {
    return $.map(facets, function(facet) {
      return buildFacetItem('payment-item', facet);
    });
  });
}

function buildFacetItem(itemType, facet) {
  let facetItem = $('<div class="' + itemType + ' facet-item col-lg-12 rounded">').data('facet', facet.name);
  let facetRow = $('<div class="row">');
  let facetValue = $('<div class="facet-value col-lg-9">').html(facet.name);
  let facetCount = $('<div class="facet-count col-lg-3">').html(facet.count);
  facetRow = facetRow.append(facetValue).append(facetCount);
  if(facet.isRefined) facetItem.addClass('facet-select');
  return facetItem.append(facetRow);}


////Records
function composeReservationCard(hit) {
  let card = $('<div class="reservation-card card">');
  let row = $('<div class="row no-gutters">');
  let col1 = $('<div class="col-auto">');
  let image = $('<img class="reservation-img img-fluid rounded" alt="">').attr('src', hit.image_url);
  let col2 = $('<div class="col">');
  let cardBlock = $('<div class="reservation-info card-block px-2">');
  let title = $('<h5 class="card-title">').html(hit.name);
  let rating = $('<p class="card-text">').html(composeRatings(hit.starts_count, true, hit.reviews_count))
  //let rating = $('<p class="card-text">').html(hit.starts_count + ' (' + hit.reviews_count + 'reviews)');
  let description = $('<p class="card-text">').html(hit.food_type + ' | ' + hit.neighborhood + ' | ' + hit.price_range);
  col1 = col1.append(image);
  cardBlock = cardBlock.append(title).append(rating).append(description);
  col2 = col2.append(cardBlock);
  row = row.append(col1).append(col2);
  return card.append(row);
}

function renderHits(content) {
  $('#results').append(function() {
    return $.map(content.hits, function(hit) {
      return composeReservationCard(hit);
    });
  });
}

helper.on('change', function(params) {
  if (params.page === 0) {
    $('#results').empty();
  }
})


////show more records
function renderSearchMore() {
  $('#show-more').remove();
  $('#results').append(function() {
    let bottomButton = $('<div id="show-more" class="text-center">');
    let showMore = $('<button id="show-more-btn" type="button" class="btn btn-outline-secondary">Show More</button>');
    return bottomButton.append(showMore);
  });
}


//// performance timing
function renderSearchStats(numRecords, timeElapsed) {
  $('#performance-stats').html(
    '<p><h6 id="performance">' + numRecords + ' results found</h6> in ' + timeElapsed + ' seconds</p>'
  );
}

////search controls
$(document).on('click', '.food-type-item', function(e) {
  let facetValue = $(this).data('facet');
  helper.toggleFacetRefinement('food_type', facetValue).search();
  $(this).toggleClass('facet-select');
});

$(document).on('click', '.rating', function(e) {
  let rating = $(this).data('rating');
  helper.removeNumericRefinement('starts_count', '>=');
  $(this).toggleClass('star-select');
  if ($(this).hasClass('star-select')) {
    $('.rating').removeClass('star-select');
    helper.addNumericRefinement('starts_count', '>=', rating);
    $(this).addClass('star-select');
  }
  helper.search();
});

$(document).on('click', '.payment-item', function(e) {
  let facetValue = $(this).data('facet');
  helper.toggleFacetRefinement('payment_options', facetValue).search();
});


$(document).on('click', '#show-more', function() {
  helper.nextPage().search();
})

$('#search-box').on('keyup', function() {
  helper.setQuery($(this).val()).search();
});

$('#location-box').on('keyup', function() {
  helper.setQuery($(this).val())
})

helper.on('result', function(content) {
  let timeElapsed = Number.parseFloat(content.processingTimeMS / 1000).toFixed(4)
  renderFacetList(content);
  renderHits(content);
  renderSearchStats(content.nbHits, timeElapsed)
  renderSearchMore();
});

helper.search();
