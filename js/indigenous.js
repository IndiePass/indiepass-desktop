const Store = require('electron-store');
const store = new Store();
const shell = require('electron').shell;
const dayjs = require('dayjs');

let snackbarElement;
let refreshReader = false;
let loadedChannel = 0;
let loadedSource = null;
let isReader = false;
let isGlobalUnread = false;
let tokenInfoAdded = false;
let targetsAdded = false;
let isOnline = true;
let isDetail = false;
let currentPost;
let postDelta;
let search = "";
let ignoreScroll = false;
let mouseBindingsAdded = false;
let channelResponse = [];
let posts = [];
let autoloadClicked = false;
let anonymousMicrosubEndpoint = 'https://indigenous.realize.be/indieweb/microsub';
let defaultAuthor = '<div class="author-avatar"><img class="avatar" src="./images/avatar_small.png" width="80" height="80" /></div>';
let defaultAuthorCard = '';
let overlayLoadmore = false;

function showLoading() {
    Pace.start();
}

function hideLoading() {
    Pace.stop();
}

/**
 * Get a value from storage.
 *
 * @param element
 * @returns {*}
 */
function configGet(element) {
    return store.get(element);
}

/**
 * Save a value in storage.
 *
 * @param name
 * @param value
 */
function configSave(name, value) {
    store.set(name, value);
}

/**
 * Clears a value in storage.
 *
 * @param name
 */
function configDelete(name) {
    store.delete(name);
}

/**
 * Render a debug message in console.
 *
 * @param log
 */
function debug(log) {
    if (configGet('debug')) {
        console.log(log);
    }
}

/**
 * Check if there's no internet connection.
 *
 * @param snackbarMessage
 * @param element
 */
function noConnection(snackbarMessage, element) {
    if (!isOnline) {

        let addBreak = '<br />';
        if (snackbarMessage) {
            addBreak = ' ';
        }
        let message = "No internet connection" + addBreak + " Check your mobile data or Wi-Fi.";

        if (snackbarMessage) {
            snackbar(message);
        }
        else {
            message += '<br />Click here to retry.';
            message = '<div class="no-connection"><img src="./images/no_connection.png" class="no-connection" /><br />' + message + ' </div>';
            $(element).html(message);
        }

        $('.no-connection').on('click', function() {
            refreshReader = true;
            loadReader();
        });

        return true;
    }

    return false;
}

/**
 * Get configuration from the Micropub endpoint.
 *
 * @param reload
 * @param setSyndications
 */
function getMicropubConfig(reload, setSyndications) {
    let micropubConfig = configGet('micropubConfig');
    if (undefined === micropubConfig || reload) {

        // First time, let's save an entry.
        if (undefined === micropubConfig) {
            configSave('micropubConfig', {});
        }

        let token = configGet('token');
        let headers = {
            'Accept': 'application/json'
        };
        if (token !== undefined) {
            headers.Authorization = 'Bearer ' + token;
        }

        $.ajax({
            type: 'GET',
            url: getMicropubEndpoint() + '?q=config',
            headers: headers,
        })
            .done(function(data) {
                debug(data);
                if (data) {
                    configSave('micropubConfig', data);
                    if (setSyndications) {
                        if (reload) {
                            targetsAdded = false;
                        }
                        addSyndicationTargetCheckboxes();
                    }
                }

                if (reload) {
                    snackbar('Micropub configuration updated');
                }
            })
            .fail(function() {
                if (reload) {
                    snackbar('Something went wrong with getting the Micropub configuration', 'error');
                }
            });
    }
    else {
        if (setSyndications) {
            addSyndicationTargetCheckboxes();
        }
    }
}

/**
 * Set syndication targets.
 */
function addSyndicationTargetCheckboxes() {
    let syndicationTargets = configGet('micropubConfig.syndicate-to');
    if (!targetsAdded && undefined !== syndicationTargets && syndicationTargets.length > 0) {
        targetsAdded = true;
        let targets = $('.syndication-targets-wrapper .targets');
        clearContainer('.syndication-target');
        showContainer('.syndication-targets-wrapper');
        for (let i = 0; i < syndicationTargets.length; i++) {
            let uid = syndicationTargets[i].uid;
            let name = syndicationTargets[i].name;
            let target = '<div class="syndication-target"><input type="checkbox" id="syndication-target-' + i + '" name="syndication_targets[' + uid + ']" value="' + uid +'"> <label for="syndication-target-' + i + '">' + name + '</label></div>';
            targets.append(target);
        }
    }
}

/**
 * Get tags from the Micropub endpoint.
 *
 * @param reload
 */
function getTags(reload) {
    let categories = configGet('categories');
    if (undefined === categories || reload) {

        // First time, let's save an entry.
        if (undefined === categories) {
            configSave('categories', []);
        }

        let token = configGet('token');
        let headers = {
            'Accept': 'application/json'
        };
        if (token !== undefined) {
            headers.Authorization = 'Bearer ' + token;
        }

        $.ajax({
            type: 'GET',
            url: getMicropubEndpoint() + '?q=category',
            headers: headers,
        })
        .done(function(data) {
            debug(data);
            if (data.categories) {
                configSave('categories', data.categories);
                setAutocomplete(categories);
            }

            if (reload) {
                snackbar('Categories updated');
            }
        })
        .fail(function() {
            if (reload) {
                snackbar('Something went wrong with getting the tags', 'error');
            }
        });
    }
    else {
        setAutocomplete(categories);
    }
}

/**
 * Set autocomplete.
 *
 * @param categories
 */
function setAutocomplete(categories) {
    if (categories.length > 0) {

        function split( val ) {
            return val.split( /,\s*/ );
        }
        function extractLast( term ) {
            return split( term ).pop();
        }

        $( "#tags" )
            // don't navigate away from the field on tab when selecting an item
            .on( "keydown", function( event ) {
                if ( event.keyCode === $.ui.keyCode.TAB &&
                    $( this ).autocomplete( "instance" ).menu.active ) {
                    event.preventDefault();
                }
            })
            .autocomplete({
                minLength: 0,
                source: function( request, response ) {
                    // delegate back to autocomplete, but extract the last term
                    response( $.ui.autocomplete.filter(
                        categories, extractLast( request.term ) ) );
                },
                focus: function() {
                    // prevent value inserted on focus
                    return false;
                },
                select: function( event, ui ) {
                    var terms = split( this.value );
                    // remove the current input
                    terms.pop();
                    // add the selected item
                    terms.push( ui.item.value );
                    // add placeholder to get the comma-and-space at the end
                    terms.push( "" );
                    this.value = terms.join( ", " );
                    return false;
                }
            });
    }
}

$(document).ready(function() {

    snackbarElement = $('.snackbar');
    $('.dismiss', snackbarElement).on('click', function() {
        snackbarElement.hide();
    })

    $('.external-link').on('click', function(e) {
        e.preventDefault();
        shell.openExternal(this.href);
    });

    $('.timeline-display').on('click', function(e) {
        let content = '<div class="tooltip-display-wrapper"><div class="display"><select class="timeline-display-select">';
        content += '<option value="title">Titles</option>';
        content += '<option value="card">Cards</option>';
        content += '<option value="feed">Feed</option>';
        content += '</select></div><div class="button tooltip-send">Change</div></div>';
        $(this)
            .tooltipster({
                animation: 'slide',
                trigger: 'click',
                content: content,
                contentAsHTML: true,
                interactive: true,
                side: ['left', 'right'],
                functionReady: function(instance, helper) {

                    let display = getDisplay();
                    let displaySelect = $('.timeline-display-select');
                    displaySelect.val(display);

                    $('.tooltip-send').on('click', function() {
                        instance.close();
                        if (displaySelect.val() !== display) {
                            configSave('timeline.display.' + loadedChannel, displaySelect.val());
                            reloadTimeline();
                        }
                    });
                }
            })
            .tooltipster('open');

    });

    setupScrollListener();

    if (!navigator.onLine) { isOnline = false; }
    window.addEventListener('offline', function(e) { isOnline = false; });
    window.addEventListener('online', function(e) { isOnline = true; });

    checkMicropubSettings(false);
    loadChannels();
    addMouseBindings();

    if (configGet('search')) {
        $('#search-form').on('submit', function(e) {
            search = $('.search-field').val();
            if (search.length > 0) {
                isGlobalUnread = false;
                $('.reader-sub-title').show().html("Search: " + search);
                $('.mark-read').hide();
                clearContainer(".timeline-item");
                loadTimeline(getMicrosubEndpoint(), "");
            }
            e.preventDefault();
        });
    }
    else {
        $('.search-wrapper').hide();
    }

    if (!isDefaultMicrosubEndpoint()) {
        $('.mark-read').on('click', function() {
            markRead();
        });
    }

    $('.reader').on('click', function() {
        loadReader();
    });

    $('.media').on('click', function() {
        loadMedia();
    });

    $('.about').on('click', function () {
        $('.menu').removeClass('selected');
        $('.about').addClass('selected');
        showContainer('#about-container');
        hideContainer('#media-container');
        hideContainer('#reader-container');
        hideContainer('#posts-container');
        hideContainer('#settings-container');
        catchExternalLinks('a');
    })

    $('.settings').on('click', function() {
        $('.menu').removeClass('selected');
        $('.settings').addClass('selected');
        hideContainer('#about-container');
        hideContainer('#media-container');
        hideContainer('#reader-container');
        hideContainer('#posts-container');
        showContainer('#settings-container');

        if (!tokenInfoAdded) {
            tokenInfoAdded = true;
            let token = configGet('token');
            if (token !== undefined) {
                $(".token-description").append('<br />').append("A token has been saved. Enter a new one to replace it.");
            }
        }
        $('#micropub-endpoint').val(getMicropubEndpoint());
        $('#microsub-endpoint').val(getMicrosubEndpoint());
        $('#media-endpoint').val(getMediaEndpoint());

        if (configGet('like_no_confirm')) {
            $('#like-direct').prop('checked', true);
        }
        if (configGet('repost_no_confirm')) {
            $('#repost-direct').prop('checked', true);
        }
        if (configGet('bookmark_no_confirm')) {
            $('#bookmark-direct').prop('checked', true);
        }
        if (configGet('mark_read_no_confirm')) {
            $('#mark-read-direct').prop('checked', true);
        }
        if (configGet('mark_read_overlay')) {
            $('#mark-read-overlay').prop('checked', true);
        }
        if (configGet('search')) {
            $('#search').prop('checked', true);
        }
        if (configGet('post_move')) {
            $('#post-move').prop('checked', true);
        }
        if (configGet('global_unread')) {
            $('#global-unread').prop('checked', true);
        }
        if (configGet('autoload_more')) {
            $('#autoload-more').prop('checked', true);
        }
        if (configGet('debug')) {
            $('#debug-message').prop('checked', true);
        }
        if (configGet('hide_notifications')) {
            $('#hide-notifications-channel').prop('checked', true);
        }

        let defaultMoveChannel = configGet('post_move_default');
        let defaultMoveSelect = $('#post-move-default');
        $.each(channelResponse, function(i, c) {
            let option = {
                value: c.uid,
                text: c.name
            };
            if (c.uid === defaultMoveChannel) {
                option.selected = true;
            }
            defaultMoveSelect.append($('<option>', option));
        });

    });

    $('.post').on('click', function() {
        $('.menu').removeClass('selected');
        $('.post').addClass('selected');
        hideContainer('#media-container');
        hideContainer('#about-container');
        hideContainer('#reader-container');
        hideContainer('#settings-container');
        showContainer('#posts-container');
        getTags(false);
        getMicropubConfig(false, true);
        $('.reload-tags').on('click', function() {
           getTags(true);
        });
        $('.reload-config').on('click', function() {
            getMicropubConfig(true, true);
        });
    });

    $('.save-settings').on('click', function() {

        configSave('like_no_confirm', $('#like-direct').is(':checked'));
        configSave('repost_no_confirm', $('#repost-direct').is(':checked'));
        configSave('bookmark_no_confirm', $('#bookmark-direct').is(':checked'));
        configSave('mark_read_no_confirm', $('#mark-read-direct').is(':checked'));
        configSave('mark_read_overlay', $('#mark-read-overlay').is(':checked'));
        configSave('search', $('#search').is(':checked'));
        configSave('post_move', $('#post-move').is(':checked'));
        configSave('global_unread', $('#global-unread').is(':checked'));
        configSave('autoload_more', $('#autoload-more').is(':checked'));
        configSave('debug', $('#debug-message').is(':checked'));
        configSave('hide_notifications', $('#hide-notifications-channel').is(':checked'));
        configSave('post_move_default', $('#post-move-default').val());

        // TODO - fix this
        /*if ($('#hide-notifications-channel').is(':checked') !== configGet('hide_notifications')) {
            refreshReader = true;
        }*/

        if (configGet('search')) {
            $('.search-wrapper').show();
        }
        else {
            $('.search-wrapper').hide();
        }

        let micropub = $('#micropub-endpoint').val();
        if (micropub !== undefined && micropub.length > 0) {
            configSave('micropub_endpoint', micropub);
        }
        else if (micropub !== undefined && micropub.length === 0 && getMicropubEndpoint().length > 0) {
            configDelete('micropub_endpoint');
        }

        let media = $('#media-endpoint').val();
        if (media !== undefined && media.length > 0) {
            configSave('media_endpoint', media);
        }
        else if (media !== undefined && media.length === 0 && getMediaEndpoint().length > 0) {
            configDelete('media_endpoint');
        }

        let microsub = $('#microsub-endpoint').val();
        if (microsub !== undefined && microsub.length > 0 && getMicrosubEndpoint() !== microsub) {
            configSave('microsub_endpoint', microsub);
            refreshReader = true;
        }
        else if (microsub !== undefined && microsub.length === 0 && !isDefaultMicrosubEndpoint()) {
            refreshReader = true;
            configDelete('microsub_endpoint');
        }

        let token = $('#token').val();
        if (token !== undefined && token.length > 0) {
            tokenInfoAdded = false;
            configSave('token', token);
            $('#token').val("");
        }

        checkMicropubSettings(true);

        snackbar('Settings have been saved');
    });

    $('.reset-settings').on('click', function() {
        refreshReader = true;
        configDelete('like_no_confirm');
        configDelete('repost_no_confirm');
        configDelete('bookmark_no_confirm');
        configDelete('mark_read_no_confirm');
        configDelete('mark_read_overlay');
        configDelete('search');
        configDelete('post_move');
        configDelete('post_move_default');
        configDelete('global_unread');
        configDelete('autoload_more');
        configDelete('hide_notifications');
        configDelete('debug');
        configDelete('micropub_endpoint');
        configDelete('microsub_endpoint');
        configDelete('media_endpoint');
        configDelete('token');
        snackbar('Settings have been reset to default');
    });

    $('.send-media').on('click', function() {

        if (noConnection(true, '')) {
            return;
        }

        showLoading();

        let mediaEndpoint = getMediaEndpoint();
        if (mediaEndpoint.length > 0) {

            let formData = new FormData();
            let file = $('#file')[0].files[0];

            if (undefined === file) {
                snackbar('Please select a file', 'error');
                return;
            }

            formData.append('file', file);
            let token = configGet('token');
            let headers = {};
            if (token !== undefined) {
                headers.Authorization = 'Bearer ' + token;
            }

            $.ajax({
                type: 'POST',
                url: mediaEndpoint,
                headers: headers,
                data: formData,
                mimeType: 'multipart/form-data',
                processData: false,
                contentType: false,
            })
            .done(function(data, status, headers) {
                let location = headers.getResponseHeader("Location");
                $('#file').val("");
                let fileUrl;
                if (undefined !== location && location.length > 0) {
                    fileUrl = "File URL: " + location;
                }
                else {
                    fileUrl = "No URL location found in response";
                }
                $('.media-url').html(fileUrl).show();
                snackbar("File uploaded");
            })
            .fail(function() {
                snackbar('Something went wrong uploading the file', 'error');
            });
        }
        else {
            snackbar('You need to configure a media endpoint in Settings', 'error');
        }

        hideLoading();
    });


    $('.send-post').on('click', function() {

       if (noConnection(true, '')) {
            return;
       }

       showLoading();

       let micropubEndpoint = getMicropubEndpoint();
       if (micropubEndpoint.length > 0) {
           if ($('#post-content').val().length > 0) {

               let token = configGet('token');
               let headers = {
                   'Accept': 'application/json'
               };
               if (token !== undefined) {
                   headers.Authorization = 'Bearer ' + token;
               }

               let postStatus = 'draft';
               if ($('#post-status').is(':checked')) {
                   postStatus = 'published';
               }

               let formData = new FormData();
               formData.append('h', 'entry');
               formData.append('post-status', postStatus);
               formData.append('content', $('#post-content').val());

               // Title.
               let title = $('#title').val();
               if (title.length > 0) {
                   formData.append('name', title);
               }

               // Tags.
               let tags = $('#tags').val().split(',');
               if (tags.length > 0) {
                   for (let i = 0, delta = 0; i < tags.length; i++) {
                       let tagTrimmed = $.trim(tags[i]);
                       if (tagTrimmed.length > 0) {
                           delta++;
                           formData.append("category[]", tagTrimmed)
                       }
                   }
               }

               // Published.
               let published = $('#published').val();
               if (published.length > 0) {
                   formData.append("published", published);
               }

               // Syndication targets.
               $(".targets input").each(function() {
                   if ($(this).is(':checked')) {
                       formData.append("mp-syndicate-to[]", $(this).val())
                   }
               });

               // Photo
               let photo = $('#photo')[0].files[0];
               if (undefined !== photo) {
                   formData.append('photo', photo);
               }

               $.ajax({
                   type: 'POST',
                   url: micropubEndpoint,
                   headers: headers,
                   data: formData,
                   mimeType: 'multipart/form-data',
                   processData: false,
                   contentType: false,
                   //contentType: 'multipart/form-data; charset=UTF-8',
               })
               .done(function(data) {
                   $('#post-content').val("");
                   snackbar("Post created");
               })
               .fail(function() {
                   snackbar('Something went wrong creating the post', 'error');
               });
           }
           else {
               snackbar('Please add some content', 'error');
           }
       }
       else {
           snackbar('You need to configure a micropub endpoint in Settings', 'error');
       }

       hideLoading();
    });

});

function setupScrollListener() {
    $(window).scroll(function () {
        if (isReader) {
            clearTimeout( $.data( this, "scrollCheck" ) );
            $.data( this, "scrollCheck", setTimeout(function() {
                // noinspection CssInvalidPseudoSelector
                if (!ignoreScroll) {
                    // noinspection CssInvalidPseudoSelector
                    let elements = $('.timeline-item:in-viewport(120)');
                    if (elements.length > 0) {
                        $('.timeline-item').removeClass('highlight', 'none');
                        $(elements[0]).addClass('highlight');
                        currentPost = parseInt($(elements[0]).data('post-delta'));
                    }
                }
                ignoreScroll = false;

                if (configGet('autoload_more') && !autoloadClicked) {
                    let next = $('.next:in-viewport');
                    if (next.length > 0) {
                        $('.next').click();
                        autoloadClicked = true;
                    }
                }

            }, 250));
        }
    });
}

/**
 * Reset search.
 */
function resetSearch() {
    if (search.length > 0) {
        search = "";
        $('.search-field').val("");
    }
}

/**
 * Check micropub settings.
 *
 * @param calledFromSettings
 */
function checkMicropubSettings(calledFromSettings) {
    let pe = getMicropubEndpoint();
    let me = getMediaEndpoint();

    if (pe.length > 0) {
        $('.post').show();
    }
    else if (calledFromSettings && pe.length === 0) {
        $('.post').hide();
    }

    if (me.length > 0) {
        $('.media').show();
    }
    else if (calledFromSettings && me.length === 0) {
        $('.media').hide();
    }

}

/**
 * Add mouse bindings.
 */
function addMouseBindings() {

    if (mouseBindingsAdded) {
        return;
    }
    mouseBindingsAdded = true;

    Mousetrap.bind('n', function() {

        if (isReader) {
            ignoreScroll = true;
            if ($('.post-' + (currentPost + 1)).length > 0) {
                currentPost++;
                $('html,body').animate({
                    scrollTop: $(".post-" + currentPost).offset().top - 90
                }, 'slow', function() {
                    $(".post-" + (currentPost - 1)).removeClass('highlight');
                    $(".post-" + currentPost).addClass('highlight');
                });
            }
            else if ($('.next').length > 0) {
                $('.next').click();
            }
        }

        if (isDetail) {
            if (posts[currentPost + 1]) {
                renderNextPostInOverlay();
            }
            else if ($('.next').length > 0) {
                overlayLoadmore = true;
                $('.next').click();
            }
        }

    });

    Mousetrap.bind('p', function() {

        if (isReader) {
            ignoreScroll = true;
            currentPost--;
            if (currentPost >= 0) {
                $('html,body').animate({
                    scrollTop: $(".post-" + currentPost).offset().top - 90
                }, 'slow', function() {
                    $(".post-" + (currentPost + 1)).removeClass('highlight');
                    $(".post-" + currentPost).addClass('highlight')
                });
            }
            else {
                currentPost = 0;
            }
        }

        if (isDetail) {
            ignoreScroll = true;
            if (posts[currentPost - 1]) {
                $('.mfp-wrap').scrollTop(0);
                $('.mfp-content').html(renderDetailView(posts[currentPost - 1], false, true));
                bindActions();
                catchExternalLinks();
                currentPost--;
            }
        }

    });

    Mousetrap.bind(['r', 'z'], function() {
        if (isReader && currentPost >= 0) {
            if ($('.post-' + currentPost + ' .zoom').length > 0) {
                $('.post-' + currentPost + ' .zoom').click();
            }
            else {
                $('.post-' + currentPost).click();
            }
        }
    });

    Mousetrap.bind(['c', 'esc'], function() {
        $('.overlay-close').click();
    });
}

function renderNextPostInOverlay() {
    $('.mfp-wrap').scrollTop(0);
    $('.mfp-content').html(renderDetailView(posts[currentPost + 1], false, true));
    bindActions();
    catchExternalLinks();
    currentPost++;
}

/**
 * Load reader.
 */
function loadReader() {
    if (refreshReader) {
        $('.no-connection').remove();
        $('.channel').remove();
        clearContainer(".timeline-item");
        refreshReader = false;
        loadChannels();
    }
    resetSearch();
    $('.menu').removeClass('selected');
    $('.reader').addClass('selected');
    showReader();
}

/**
 * Shows the reader.
 */
function showReader() {
    hideContainer('#about-container');
    hideContainer('#media-container');
    hideContainer('#settings-container');
    hideContainer('#posts-container');
    showContainer('#reader-container');
}

/**
 * Load media.
 */
function loadMedia() {
    $('.menu').removeClass('selected');
    $('.media').addClass('selected');
    hideContainer('#about-container');
    hideContainer('#reader-container');
    hideContainer('#settings-container');
    hideContainer('#posts-container');
    showContainer('#media-container');
}

/**
 * Shows a message in the snackbar.
 *
 * @param message
 * @param type
 */
function snackbar(message, type) {
    type = (typeof type !== 'undefined') ? type : 'success';

    snackbarElement.show('fast');
    $('.message', snackbarElement).html(message);
    snackbarElement.removeClass('error', 'success');
    snackbarElement.addClass(type);

    if (type !== 'error') {
        setTimeout(function () {
            snackbarElement.hide('slow');
        }, 5000);
    }
    // TODO trigger webtools, and add a message?
    /*else if (configGet('debug')) {
        $('.debug', snackbarElement).show().on('click', function() {
            //mainWindow.webContents.openDevTools()
        });
    }*/

}
/**
 * Get the display.
 */
function getDisplay() {
    let display = 'feed';

    let storedDisplay = configGet('timeline.display.' + loadedChannel);
    if (storedDisplay !== undefined) {
        display = storedDisplay;
    }

    return display;
}

/**
 * Return the Microsub endpoint.
 *
 * @returns {string}
 */
function getMicrosubEndpoint() {
    let microsub_endpoint = configGet('microsub_endpoint');
    if (microsub_endpoint !== undefined) {
        return microsub_endpoint;
    }
    else {
        return anonymousMicrosubEndpoint;
    }
}

/**
 * Returns whether the anonymous Microsub endpoint is used.
 *
 * @returns {boolean}
 */
function isDefaultMicrosubEndpoint() {
    return getMicrosubEndpoint() === anonymousMicrosubEndpoint;
}

/**
 * Return the micropub base url.
 *
 * @returns {string}
 */
function getMicropubEndpoint() {
    let micropub_endpoint = configGet('micropub_endpoint');
    if (micropub_endpoint !== undefined) {
        return micropub_endpoint;
    }
    return "";
}

/**
 * Return the media base url.
 *
 * @returns {string}
 */
function getMediaEndpoint() {
    let media_endpoint = configGet('media_endpoint');
    if (media_endpoint !== undefined) {
        return media_endpoint;
    }
    return "";
}

function showContainer(selector) {
    $(selector).show();
}

function hideContainer(selector) {
    $(selector).hide();
}

function clearContainer(selector) {
    $(selector).remove()
}

/**
 * Do a request to the micropub or microsub endpoint.
 *
 * @param properties
 * @param type
 * @param element
 */
function doRequest(properties, type, element) {

    let token = configGet('token');
    let headers = {
        'Accept': 'application/json'
    };
    if (token !== undefined) {
        headers.Authorization = 'Bearer ' + token;
    }

    let endpoint = getMicropubEndpoint();
    if (type !== 'delete' && type !== 'move' && type !== 'unread' && type !== 'read') {
        properties.h = 'entry';
        properties['post-status'] = 'published';
    }
    else {
        endpoint = getMicrosubEndpoint();
    }

    $.ajax({
        type: 'POST',
        url: endpoint,
        headers: headers,
        data: properties,
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    })
    .done(function() {

        // Change channel counter.
        if (type === 'unread' || type === 'read') {
            if (configGet('global_unread')) {
                changeChannelCount(type, 'global');
            }
            changeChannelCount(type, properties.channel);
        }

        if (element != null) {

            let originalType = type;
            if (type === 'read-of') {
                type = 'read';
            }

            let backgroundImage = 'images/button_' + type + '_pressed.png';

            if (type === 'read' && originalType !== 'read-of') {
                backgroundImage = 'images/button_unread.png';
                element.attr('data-action', 'unread');
                element.data('action', 'unread');
                element.removeClass('action-read');
                element.addClass('action-unread');
            }
            if (type === 'unread') {
                element.attr('data-action', 'read');
                element.data('action', 'read');
                element.removeClass('action-unread');
                element.addClass('action-read');
                backgroundImage = 'images/button_read.png';
            }

            element.css('background-image', 'url(' + backgroundImage + ')');
        }

    })
    .fail(function() {
        snackbar('Something went wrong with this action', 'error');
    });
}

/**
 * Change channel count.
 *
 * @param type
 * @param channel
 */
function changeChannelCount(type, channel) {
    let el = $('.channel-indicator-' + channel);
    let unread = parseInt(el.html()) || 0;

    if (unread === 0 && type === 'unread') {
        el.html(1)
    }

    else if (type === 'global_read') {
        let gel = $('.channel-indicator-global');
        let gUnread = parseInt(gel.html()) || 0;
        if (unread > 0) {
            let value = gUnread - unread;
            if (value === 0) {
                value = '';
            }
            gel.html(value);
        }
    }

    else if (type === 'read') {
        let value = unread - 1;
        if (value === 0) {
            value = '';
        }
        el.html(value);
    }

    else if (type === 'unread') {
        el.html(unread + 1);
    }
}

/**
 * Load channels.
 */
function loadChannels() {
    showLoading();

    if (noConnection(false, '#reader-container')) {
        hideLoading();
        return;
    }

    isReader = true;

    let disableNotificationChannel = configGet('hide_notifications');
    let baseUrl = getMicrosubEndpoint();
    let token = configGet('token');
    let headers = {
        'Accept': 'application/json'
    };
    if (token !== undefined) {
        headers.Authorization = 'Bearer ' + token;
    }
    $.ajax({
        type: 'GET',
        url: baseUrl + '?action=channels',
        headers: headers,
    })
    .done(function(data) {

        debug(data);
        let channels = $('.channel-wrapper');

        let total = 0;
        if (configGet('global_unread')) {
            let channel = '<div class="channel global-unread-channel" data-channel="global" data-link="">Home&nbsp;<span class="indicator channel-indicator-global"></span></div>';
            channels.append(channel);
        }

        channelResponse = data.channels;
        $.each(channelResponse, function(i, item) {

            if (item.uid === 'notifications' && disableNotificationChannel) {
                return;
            }

            let indicator = '&nbsp;<span class="indicator channel-indicator-' + item.uid + '"></span>';
            if (undefined !== item.unread) {
                if (typeof(item.unread) === "boolean") {
                    if (item.unread) {
                        indicator = '&nbsp;<span class="indicator channel-indicator-' + item.uid + '">New</span>'
                    }
                }
                else {
                    if (item.unread > 0) {
                        total += item.unread;
                        indicator = '&nbsp;<span class="indicator channel-indicator-' + item.uid + '">' + item.unread +  '</span>'
                    }
                }
            }
            let timeline_url = baseUrl + '?action=timeline&channel=' + item.uid;
            let channelClasses = "channel channel-" + i;
            let channel = '<div class="' + channelClasses + '" data-channel="' + item.uid + '" data-link="' + timeline_url + '">' + item.name + indicator + '</div>';
            channels.append(channel);
        });

        if (total > 0 && configGet('global_unread')) {
            $('.channel-indicator-global').html(total);
        }

        $('.channel').click(function() {

            showLoading();
            if (!$('#reader-container').is(':visible')) {
                showReader();
            }

            renderChannel($(this));
            hideLoading();
        });

        // Load global if configured.
        if (configGet('global_unread')) {
            isGlobalUnread = true;
            loadedChannel = 'global';
            loadTimeline(baseUrl, "");
            $('.global-unread-channel').addClass('channel-highlight');
        }

    })
    .fail(function() {
        snackbar('Something went wrong loading the channels', 'error');
    });

    hideLoading();
}

/**
 * Mark read.
 */
function markRead() {
    let baseUrl = getMicrosubEndpoint();
    let token = configGet('token');
    let headers = {
        'Accept': 'application/json'
    };
    if (token !== undefined) {
        headers.Authorization = 'Bearer ' + token;
    }

    let data = {
        'action': 'timeline',
        'method': 'mark_read',
        'channel': loadedChannel,
    };

    let entries = [];
    if (isGlobalUnread) {
        $.each(posts, function(i, item) {
           entries.push(item._id);
        });
        data.entry = entries;
        $('.indicator').html('');
    }
    else {
        // TODO fix this, although this works for Drupal,
        //  I guess other microsub servers behave differently.
        data.last_read_entry = 'everything';
    }

    $.ajax({
        type: 'POST',
        url: baseUrl,
        data: data,
        headers: headers,
    })
    .done(function(data) {
        $('.new').hide();

        if (configGet('global_unread') && loadedChannel !== 'global') {
            changeChannelCount('global_read', loadedChannel);
        }

        $('.channel-indicator-' + loadedChannel).html("");
        snackbar('All items marked as read');
    })
    .fail(function() {
        snackbar('Something went wrong marking the timeline as read', 'error');
    });
}

/**
 * Render a channel
 *
 * @param channel
 *   The channel element.
 */
function renderChannel(channel) {
    loadedSource = null;
    resetSearch();
    $('.channel').removeClass('channel-highlight');
    channel.addClass('channel-highlight');
    let url = channel.data('link');
    if (channel.hasClass('global-unread-channel')) {
        url = getMicrosubEndpoint();
        isGlobalUnread = true;
    }
    else {
        isGlobalUnread = false;
        $('.mark-read').css('display', 'inline-block');
    }
    $('.reader-sub-title').hide();
    clearContainer(".timeline-item");
    loadedChannel = channel.data('channel');
    $(window).scrollTop(0);
    loadTimeline(url, "");
}

/**
 * Reload a timeline.
 */
function reloadTimeline() {
    let c = $('.channel-highlight');
    renderChannel(c);
}

/**
 * Load a timeline.
 *
 * @param timelineUrl
 *   The timeline URL.
 * @param after
 *   The after value
 */
function loadTimeline(timelineUrl, after) {

    if (after.length === 0) {
        currentPost = 0;
        postDelta = 0;
        posts = [];
    }

    let token = configGet('token');
    let headers = {
        'Accept': 'application/json'
    };
    if (token !== undefined) {
        headers.Authorization = 'Bearer ' + token;
    }

    let finalTimelineUrl = timelineUrl;

    if (isGlobalUnread) {
        finalTimelineUrl += "?action=timeline&channel=global&is_read=false"
    }

    if (finalTimelineUrl.indexOf('?') === -1) {
        finalTimelineUrl += '?';
    }

    if (after.length > 0) {
        finalTimelineUrl += '&after=' + after;
    }

    if (loadedSource != null) {
        finalTimelineUrl += "&source=" + loadedSource;
    }

    let method = 'GET';
    let data = {};
    if (search.length > 0) {
        method = 'POST';
        data['action'] = 'search';
        data['channel'] = 'global';
        data['query'] = search;
    }

    $.ajax({
        type: method,
        url: finalTimelineUrl,
        headers: headers,
        data: data,
    })
    .done(function(data) {
        debug(data);

        let display = getDisplay();

        let postsContainer = $('#timeline-container .posts');
        let pagerContainer = $('#timeline-container .pager');

        // Empty items.
        if (data.items.length === 0) {
            let empty = '<div class="timeline-item empty-view">You have read everything!</div>'
            postsContainer.append(empty);
        }

        // Posts.
        $.each(data.items, function(i, item) {
            let renderedPost = renderPost(item, display);
            if (renderedPost.length > 0) {
                posts[postDelta] = item;
                let postClasses = 'timeline-item post-' + postDelta;
                if (display === 'card') {
                    postClasses += " card-view";
                }
                else if (display === 'title') {
                    postClasses += " title-view";
                }
                else {
                    postClasses += " feed-view";
                }

                if (postDelta === 0) {
                    postClasses += " highlight";
                }

                let post = '<div class="' + postClasses + '" data-post-delta="' + postDelta + '">' + renderedPost + '</div>';
                postsContainer.append(post);
                postDelta++;
            }
        });

        if (overlayLoadmore) {
            overlayLoadmore = false;
            renderNextPostInOverlay();
        }

        // Pager.
        if (undefined !== data.paging && undefined !== data.paging.after) {
            pagerContainer.show();
            let next = '<span class="next">More posts</span>';
            pagerContainer.html(next);
            autoloadClicked = false;
            $('.next').on('click', function() {
                loadTimeline(timelineUrl, data.paging.after.toString());
            });
        }
        else {
            pagerContainer.hide();
        }

        // Author link.
        $('.author-name').click(function() {
            let source_id =  $(this).data('source-id');
            if (undefined !== source_id) {
                $('.reader-sub-title').show().html("Source: " + $(this).html());
                clearContainer(".timeline-item");
                loadedSource = source_id;
                isGlobalUnread = false;
                loadTimeline(timelineUrl, "");
            }
        });

        // Inline actions.
        bindActions();

        // Catch all links.
        catchExternalLinks('.timeline-item a');

        // Overlay click.
        $('.zoom, .card-view, .title-view').on('click', function() {
            let index = $(this).data('post-delta');
            // TODO better detection
            if (undefined === index) {
                index = $(this).parent().parent().data('post-delta');
            }
            if (undefined === index) {
                index = $(this).parent().data('post-delta');
            }
            if (posts[index]) {
                currentPost = index;
                let content = renderDetailView(posts[index], false, true);
                isReader = false;
                isDetail = true;
                $.magnificPopup.open({
                    items: {src: content},
                    closeOnBgClick: false,
                    enableEscapeKey: false,
                    showCloseBtn: false,
                    closeBtnInside: false
                    // You may add options here, they're exactly the same as for $.fn.magnificPopup call
                    // Note that some settings that rely on click event (like disableOn or midClick) will not work here
                }, 0);
                catchExternalLinks('.mfp-content a');
                bindActions();
            }
        });

    })
    .fail(function() {
        snackbar('Something went wrong loading the timeline', 'error');
    });

}

/**
 * Catch all external links.
 *
 * @param selector
 */
function catchExternalLinks(selector) {
    $(selector).on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        shell.openExternal(this.href);
    });
}

/**
 * Bind actions.
 */
function bindActions() {

    $('.overlay-close').on('click', function() {
        $.magnificPopup.close();
        isReader = true;
        isDetail = false;
    });

    $('.action').on('click', function(e) {
        e.stopPropagation();
        let url = $(this).parent().parent().data('url');
        let entry = $(this).parent().parent().data('entry');
        let channel = $(this).parent().parent().data('channel');
        if (url.length > 0) {
            let type = $(this).data('action');
            let element = $(this);
            if (type === 'external') {
                shell.openExternal(url);
            }
            else if (type === 'read-of') {
                $(this)
                    .tooltipster({
                        animation: 'slide',
                        trigger: 'click',
                        content: '<div class="tooltip-read-wrapper"><div class="inline-read"><select class="read-response"><option value="">Omit status</option><option value="to-read">To read</option><option value="reading">Reading</option><option value="finished">Finished</option></select></div><div class="button tooltip-send">Send</div></div>',
                        contentAsHTML: true,
                        interactive: true,
                        side: ['left', 'right'],
                        functionReady: function(instance, helper) {
                            $('.tooltip-send').on('click', function() {
                                instance.close();
                                let prop = 'read-of';
                                let properties = {};
                                properties[prop] = url;
                                let readResponse = $('.read-response').val();
                                if (readResponse.length > 0) {
                                    properties['read-status'] = readResponse;
                                }
                                doRequest(properties, type, element);
                            });
                        }
                    })
                    .tooltipster('open');
            }
            else if (type === 'rsvp') {
                $(this)
                    .tooltipster({
                        animation: 'slide',
                        trigger: 'click',
                        content: '<div class="tooltip-rsvp-wrapper"><div class="inline-rsvp"><select class="rsvp-response"><option value="yes">I\'m going!</option><option value="maybe">Maybe</option><option value="interested">Interested</option><option value="no">Can not attend</option></select></div><div class="button tooltip-send">RSVP</div></div>',
                        contentAsHTML: true,
                        interactive: true,
                        side: ['left', 'right'],
                        functionReady: function(instance, helper) {
                            $('.tooltip-send').on('click', function() {
                                instance.close();
                                let prop = 'in-reply-to';
                                let properties = {};
                                properties[prop] = url;
                                properties.rsvp = $('.rsvp-response').val();
                                doRequest(properties, type, element);
                            });
                        }
                    })
                    .tooltipster('open');
            }
            else if (type === 'move') {
                let defaultChannel = configGet('post_move_default');
                let content = '<div class="tooltip-move-wrapper"><div class="inline-move"><select class="move-channel">';
                $.each(channelResponse, function (i, item) {
                    let selected = "";
                    if (item.uid === defaultChannel) {
                        selected = " selected";
                    }
                    content += '<option value="' + item.uid + '"' + selected + '>' + item.name + '</option>';
                });
                content += '</select></div><div class="button tooltip-send">Move</div></div>';
                $(this)
                    .tooltipster({
                        animation: 'slide',
                        trigger: 'click',
                        content: content,
                        contentAsHTML: true,
                        interactive: true,
                        side: ['left', 'right'],
                        functionReady: function(instance, helper) {
                            $('.tooltip-send').on('click', function() {
                                instance.close();
                                let properties = {};
                                properties["entry"] = entry;
                                properties["action"] = "timeline";
                                properties["method"] = "move";
                                properties["channel"] = $('.move-channel').val();
                                doRequest(properties, type, element);
                            });
                        }
                    })
                    .tooltipster('open');
            }
            else if (type === 'like' || type === 'repost' || type === 'bookmark' || type === 'delete' || type === 'unread' || type === 'read') {
                let properties = {};
                let noConfirmKey = type + '_no_confirm';
                if (type === 'delete') {
                    properties["entry"] = entry;
                    properties["action"] = "timeline";
                    properties["method"] = "remove";
                    properties["channel"] = channel;
                }
                else if (type === 'unread') {
                    noConfirmKey = 'mark_read_no_confirm';
                    properties["entry[]"] = entry;
                    properties["action"] = "timeline";
                    properties["method"] = "mark_unread";
                    properties["channel"] = channel;
                }
                else if (type === 'read') {
                    noConfirmKey = 'mark_read_no_confirm';
                    properties["entry[]"] = entry;
                    properties["action"] = "timeline";
                    properties["method"] = "mark_read";
                    properties["channel"] = channel;
                }
                else {
                    let prop = type + '-of';
                    properties[prop] = url;
                }


                if (configGet(noConfirmKey)) {
                    doRequest(properties, type, element);
                }
                else {
                    // TODO check multiple binding (although tooltipster protects against it)
                    $(this)
                        .tooltipster({
                            animation: 'slide',
                            trigger: 'click',
                            content: type + ' this entry?<div class="tooltip-confirm-wrapper"><div class="tooltip-confirm">Yes!</div><div class="tooltip-close">Nevermind!</div></div>',
                            contentAsHTML: true,
                            interactive: true,
                            side: ['left', 'right'],
                            functionReady: function(instance, helper) {
                                $('.tooltip-confirm').on('click', function() {
                                    instance.close();
                                    doRequest(properties, type, element);
                                });
                                $('.tooltip-close').on('click', function() {
                                    instance.close();
                                });
                            }
                        })
                        .tooltipster('open');
                }
            }
            else {
                $(this)
                    .tooltipster({
                        animation: 'slide',
                        trigger: 'click',
                        content: '<div class="tooltip-reply-wrapper"><div class="inline-reply"><textarea placeholder="Type your reply - click anywhere to close this" cols="60", rows="4" class="inline-textarea"></textarea></div><div class="button tooltip-send">Send</div></div>',
                        contentAsHTML: true,
                        interactive: true,
                        side: ['bottom', 'top', 'right'],
                        functionReady: function(instance, helper){
                            $('.tooltip-send').on('click', function() {
                                if ($('.inline-textarea').val().length > 0) {
                                    instance.close();
                                    let prop = 'in-reply-to';
                                    let properties = {};
                                    properties[prop] = url;
                                    properties.content = $('.inline-textarea').val();
                                    doRequest(properties, type, element);
                                }
                                else {
                                    $('.inline-textarea').attr('placeholder', 'Please add some content for this reply');
                                }
                            });
                        }
                    })
                    .tooltipster('open');
            }
        }
    });
}

/**
 * Render a post.
 *
 * @param {Object} item
 * @param {String} display
 *
 * return {string}
 */
function renderPost(item, display) {

    if (item.type !== undefined && item.type === "card") {
        return "";
    }

    if (display === 'title') {
        return renderTitleView(item);
    }
    else if (display === 'card') {
        return renderCardView(item);
    }
    else {
        return renderDetailView(item, true, false);
    }

}

/**
 * Render card view.
 *
 * @param {Object} item
 *
 * @returns {string}
 */
function renderTitleView(item) {
    let post = "";

    // Content wrapper.
    post += '<div class="post-content-wrapper">';

    // Title.
    if (item.name) {
        post += '<div class="title">' + item.name + '</div>';
    }
    else {
        let content = "";
        let hasContent = false;
        if (item.content !== undefined) {
            if (item.content.text !== undefined) {
                hasContent = true;
                content = item.content.text;
            }
            else if (item.content.html !== undefined) {
                hasContent = true;
                content = item.content.html;
            }
        }

        if (!hasContent && item.summary !== undefined) {
            content = item.summary;
        }

        if (content.length > 0) {
            post += '<div class="title">' + content.substr(0, 120) + ' ...</div>';
        }
    }

    // Published time.
    if (item.published) {
        post += '<div class="published-on">' + dayjs(item.published).format('DD/MM/YYYY HH:mm') + '</div>';
    }

    // Author.
    let authorName = "";
    let authorUrl = "";
    if (item.author) {
        if (item.author.name && item.author.name.length > 0) {
            authorName = item.author.name;
        }

        if (item.author.url && item.author.url.length > 0) {
            authorUrl = item.author.url;
        }
    }

    // Author name.
    if (authorName.length > 0) {
        post += '<div class="author-name">' + authorName + '</div>';
    }

    // Author url.
    if (authorUrl.length > 0) {
        post += '<div class="url">' + authorUrl + '</div>';
    }

    // Closing wrapper.
    post += '</div>';

    return post;
}

/**
 * Render card view.
 *
 * @param {Object} item
 *
 * @returns {string}
 */
function renderCardView(item) {
    let post = "";

    post += renderMiniActions(item);

    // Author.
    let authorName = "";
    let authorUrl = "";
    post += '<div>';
    if (item.author) {
        if (item.author.name && item.author.name.length > 0) {
            authorName = item.author.name;
        }

        if (item.author.url && item.author.url.length > 0) {
            authorUrl = item.author.url;
        }
    }
    else {
        post += defaultAuthorCard;
    }

    // End author wrapper.
    post += '</div>';

    // Content wrapper.
    post += '<div class="post-content-wrapper">';

    // Title.
    if (item.name) {
        post += '<div class="title">' + item.name + '</div>';
    }

    // Author name.
    if (authorName.length > 0) {
        post += '<div class="author-name">' + authorName + '</div>';
    }

    // Author url.
    if (authorUrl.length > 0) {
        post += '<div class="url">' + authorUrl + '</div>';
    }

    // Published time.
    if (item.published) {
        post += '<div class="published-on">' + dayjs(item.published).format('DD/MM/YYYY HH:mm') + '</div>';
    }

    if (item.photo !== undefined) {
        post += '<div class="image"><img loading="lazy" src="' + item.photo[0] + '" /></div>';
    }
    else {
        let content = "";
        let hasContent = false;
        if (item.content !== undefined) {
            if (item.content.html !== undefined) {
                hasContent = true;
                content = item.content.html;
            }
            else if (item.content.text !== undefined) {
                hasContent = true;
                content = item.content.text;
            }
        }

        if (!hasContent && item.summary !== undefined) {
            content = item.summary;
        }

        if (content.length > 0) {
            post += '<div class="content-card-view">' + $.trim($('<div>').html(content).text().substr(0, 300)) + ' ...</div>';
        }

    }

    // Closing wrapper.
    post += '</div>';

    return post;
}

/**
 * Render feed view.
 *
 * @param {Object} item
 * @param {Boolean} truncate
 * @param {Boolean} actionsAtTop
 *
 * @returns {string}
 */
function renderDetailView(item, truncate, actionsAtTop) {
    let post = "";
    let type = "entry";

    // Actions.
    if (actionsAtTop) {
        post += renderActions(item, type, true);
    }

    // Auto mark read.
    if (actionsAtTop && configGet('mark_read_overlay') && item._is_read === false) {
        let properties = {};
        item._is_read = true;
        properties["entry[]"] = item._id;
        properties["action"] = "timeline";
        properties["method"] = "mark_read";
        properties["channel"] = item._channel.id;
        doRequest(properties, 'read', null);
    }

    // Zoom
    if (!actionsAtTop) {
        post += '<div class="zoom"></div>';
    }

    // TODO harmonize this in a function
    // Author.
    let authorName = "";
    let authorUrl = "";
    post += '<div class="author-wrapper">';
    if (item.author) {

        if (item.author.name && item.author.name.length > 0) {
            authorName = item.author.name;
        }

        if (item.author.url && item.author.url.length > 0) {
            authorUrl = item.author.url;
        }

        if (item.author.photo) {
            post += '<div class="author-avatar"><img loading="lazy" alt="' + authorName + '" class="avatar" src="' + item.author.photo + '" width="80" height="80" /></div>';
        }
        else {
            post += defaultAuthor;
        }
    }
    else {
        post += defaultAuthor;
    }

    if (item._is_read === false) {
        post += '<div class="new">New</div>'
    }

    // End author wrapper.
    post += '</div>';

    // Content wrapper.
    post += '<div class="post-content-wrapper">';

    // Title.
    if (item.name) {
        post += '<div class="title">' + item.name + '</div>';
    }

    // Author name.
    if (authorName.length > 0) {
        let sourceAttributes = "";
        if (undefined !== item._source) {
            sourceAttributes = ' data-source-id="' + item._source + '"';
        }

        let classes = "";
        if (!actionsAtTop) {
            classes = 'class="author-name" ';
        }

        post += '<div ' + classes + sourceAttributes + '>' + authorName + '</div>';
    }

    // Author url.
    if (authorUrl.length > 0) {
        post += '<div class="url">' + authorUrl + '</div>';
    }

    // Published time.
    if (item.published) {
        post += '<div class="published-on">' + dayjs(item.published).format('DD/MM/YYYY HH:mm') + '</div>';
    }

    // Define a reference to check after content.
    let postType = "";
    let checkReference = "";

    // Post context, e. reply, repost or quotation.
    let types = {'like-of': 'Liked', 'repost-of': 'Reposted', 'quotation-of': 'Quoted', 'in-reply-to': 'Replied to'};
    $.each(types , function(index, val) {
        if (item[index]) {
            postType = index;
            checkReference = item[index];
            post += '<div class="post-type">' + val + ' <a href="' + item[index] + '">' + item[index] + '</a></div>';
        }
    });

    let content = "";
    let hasContent = false;
    if (item.content !== undefined) {
        if (item.content.html !== undefined && item.content.html.length > 0) {
            hasContent = true;
            content = item.content.html;
        }
        else if (item.content.text !== undefined && item.content.text.length > 0) {
            hasContent = true;
            content = item.content.text;
        }
    }

    if (!hasContent && item.summary !== undefined && item.summary.length > 0) {
        content = item.summary;
    }

    if (content.length > 0) {
        if (truncate && content.length > 800) {
            post += '<div class="content-truncated">' + content + ' ...</div>';
        }
        else {
            post += '<div class="content">' + content + '</div>';
        }
    }

    if (checkReference.length > 0 && undefined !== item.refs && undefined !== item.refs[checkReference]) {
        let ref = item.refs[checkReference];

        if (undefined !== ref.content && postType !== 'repost-of') {
            if (ref.content.text) {
                post += '<div class="reference">' + ref.content.text + '</div>';
            }
        }

        if (undefined !== ref.video) {
            post += '<div class="video"> <video controls preload="none"> <source src="' + ref.video[0] + '"> </video> </div>';
        }

        if (undefined !== ref.photo) {
            for (let i = 0; i < ref.photo.length; i++) {
                post += '<div class="image"><img loading="lazy" src="' + ref.photo[i] + '" /></div>';
            }
        }
    }

    if (item.photo !== undefined) {
        for (let i = 0; i < item.photo.length; i++) {
            post += '<div class="image"><img loading="lazy" src="' + item.photo[i] + '" /></div>';
        }
    }

    if (item.video !== undefined) {
        post += '<div class="video"> <video controls preload="none"> <source src="' + item.video[0] + '"> </video> </div>';
    }

    if (item.audio !== undefined) {
        post += '<div class="audio"> <audio controls preload="none"> <source src="' + item.audio[0] + '"> </audio> </div>';
    }

    // Actions.
    if (!actionsAtTop) {
        post += renderActions(item, postType, false);
    }

    // Closing wrapper.
    post += '</div>';

    return post;
}

/**
 * Renders actions.
 *
 * @param {Object} item
 * @param {String} type
 * @param {Boolean} renderClose
 *
 * @returns {string}
 */
function renderActions(item, type, renderClose) {
    let actions = "";

    if (!isDefaultMicrosubEndpoint() && item.url) {
        let url = "";
        if (item.url.length > 0) {
            url = item.url;
        }

        actions += '<div class="actions" data-url="' + url + '" data-entry="' + item._id + '" data-channel="' + item._channel.id + '">';
        actions += '<div class="actions-column">';
        if (getMicropubEndpoint().length > 0) {
            actions += '<div class="action action-reply" data-action="reply" title="Reply"></div>';
            actions += '<div class="action action-like" data-action="like" title="Like"></div>';
            actions += '<div class="action action-repost" data-action="repost" title="Repost"></div>';
            actions += '<div class="action action-bookmark" data-action="bookmark" title="Bookmark"></div>';
            actions += '<div class="action action-read-of" data-action="read-of" title="Read"></div>';
            if (type === "event") {
                actions += '<div class="action action-rsvp" data-action="rsvp" title="RSVP"></div>';
            }
        }
        actions += '</div>';
        actions += '<div class="actions-column">';

        if (item._is_read !== false) {
            actions += '<div class="action action-unread" data-action="unread" title="Mark unread"></div>';
        }
        else {
            actions += '<div class="action action-read" data-action="read" title="Mark read"></div>';
        }
        actions += '<div class="action action-external" data-action="external" title="Visit site"></div>';
        if (configGet('post_move')) {
            actions += '<div class="action action-move" data-action="move" title="Move"></div>';
        }
        actions += '<div class="action action-delete" data-action="delete" title="Delete"></div>';

        if (renderClose) {
            actions += '<div class="overlay-close" title="Close overlay"></div>'
        }

        actions += '</div></div>';
    }

    return actions;
}

/**
 * Renders mini actions.
 *
 * @param {Object} item
 *
 * @returns {string}
 */
function renderMiniActions(item) {
    let actions = "";

    if (!isDefaultMicrosubEndpoint() && item.url) {
        let url = "";
        if (item.url.length > 0) {
            url = item.url;
        }

        actions += '<div class="actions mini-actions" data-url="' + url + '" data-entry="' + item._id + '" data-channel="' + item._channel.id + '">';
        actions += '<div class="actions-column">';
        if (item._is_read !== false) {
            actions += '<div class="action action-unread" data-action="unread" title="Mark unread"></div>';
        }
        else {
            actions += '<div class="action action-read" data-action="read" title="Mark read"></div>';
        }
        actions += '<div class="action action-external" data-action="external" title="Visit site"></div>';
        if (configGet('post_move')) {
            actions += '<div class="action action-move" data-action="move" title="Move"></div>';
        }
        actions += '</div></div>';
    }

    return actions;
}