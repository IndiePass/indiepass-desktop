const Store = require('electron-store');
const store = new Store();
const shell = require('electron').shell;
const dayjs = require('dayjs');

let snackbarElement;
let refreshChannels = false;
let currentChannel = 0;
let tokenInfoAdded = false;
let targetsAdded = false;
let isOnline = true;
let currentPost;
let postIndex;
let anonymousMicrosubEndpoint = 'https://indigenous.realize.be/indieweb/microsub';
let defaultAuthor = '<div class="author-avatar"><img class="avatar" src="./images/avatar_small.png" width="80" height="80" /></div>';

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
            refreshChannels = true;
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

/**
 * Remove config
 *
 * @param name
 */
function configDelete(name) {
    store.clear(name);
}

$(document).ready(function() {

    snackbarElement = $('.snackbar');

    if (!navigator.onLine) { isOnline = false; }
    window.addEventListener('offline', function(e) { isOnline = false; });
    window.addEventListener('online', function(e) { isOnline = true; });

    loadChannels();
    Mousetrap.bind('n', function() {
        if ($('.post-' + (currentPost + 1)).length > 0) {
            currentPost++;
            $('html,body').animate({
                scrollTop: $(".post-" + currentPost).offset().top - 10
            }, 'slow', function() {
                $(".post-" + (currentPost - 1)).css('border', 'none');
                $(".post-" + currentPost).css('border', '1px solid #DD645E')
            });
        }
        else if ($('.next').length > 0) {
            $('.next').click();
        }
    });

    Mousetrap.bind('p', function() {
        currentPost--;
        if (currentPost >= 0) {
            $('html,body').animate({
                scrollTop: $(".post-" + currentPost).offset().top
            }, 'slow', function() {
                $(".post-" + (currentPost + 1)).css('border', 'none');
                $(".post-" + currentPost).css('border', '1px solid #DD645E')
            });
        }
        else {
            currentPost = 0;
        }
    });

    Mousetrap.bind('r', function() {
        if (currentPost >= 0) {
            $('.post-' + currentPost + ' .read-more').click();
        }
    });

    Mousetrap.bind('c', function() {
        $('.overlay-close').click();
    });

    if (isDefaultMicrosubEndpoint()) {
        $('.mark-read').hide();
    }
    else {
        $('.mark-read').on('click', function() {
            markRead();
        });
    }

    $('.overlay-close').on('click', function() {
      hideContainer('#overlay-container');
    });

    $('.back-to-channels').on('click', function() {
        hideContainer('#media-container');
        hideContainer('#timeline-container');
        hideContainer('#posts-container');
        hideContainer('#settings-container');
        showContainer('#channels-container');
    });

    $('.reader').on('click', function() {
        loadReader();
    });

    $('.media').on('click', function() {
        loadMedia();
    });

    $('.settings').on('click', function() {
        $('.menu').removeClass('selected');
        $('.settings').addClass('selected');
        hideContainer('#media-container');
        hideContainer('#channels-container');
        hideContainer('#timeline-container');
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
        if (configGet('debug')) {
            $('#debug-message').prop('checked', true);
        }

    });

    $('.post').on('click', function() {
        $('.menu').removeClass('selected');
        $('.post').addClass('selected');
        hideContainer('#media-container');
        hideContainer('#channels-container');
        hideContainer('#timeline-container');
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
        configSave('debug', $('#debug-message').is(':checked'));

        let micropub = $('#micropub-endpoint').val();
        if (micropub !== undefined && micropub.length > 0) {
            configSave('micropub_endpoint', micropub);
        }

        let media = $('#media-endpoint').val();
        if (media !== undefined && media.length > 0) {
            configSave('media_endpoint', media);
        }

        let microsub = $('#microsub-endpoint').val();
        if (microsub !== undefined && microsub.length > 0) {
            configSave('microsub_endpoint', microsub);
            refreshChannels = true;
        }

        let token = $('#token').val();
        if (token !== undefined && token.length > 0) {
            tokenInfoAdded = false;
            configSave('token', token);
            $('#token').val("");
        }

        snackbar('Settings have been saved');
    });

    $('.reset-settings').on('click', function() {
        refreshChannels = true;
        configDelete('like_no_confirm');
        configDelete('repost_no_confirm');
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
    });


    $('.send-post').on('click', function() {

       if (noConnection(true, '')) {
            return;
       }

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
    });

});

/**
 * Load reader.
 */
function loadReader() {
    if (refreshChannels) {
        $('.no-connection').remove();
        $('.channel').remove();
        refreshChannels = false;
        loadChannels();
    }
    $('.menu').removeClass('selected');
    $('.reader').addClass('selected');
    hideContainer('#media-container');
    hideContainer('#settings-container');
    hideContainer('#timeline-container');
    hideContainer('#posts-container');
    showContainer('#channels-container');
}

/**
 * Load media.
 */
function loadMedia() {
    $('.menu').removeClass('selected');
    $('.media').addClass('selected');
    hideContainer('#channels-container');
    hideContainer('#settings-container');
    hideContainer('#timeline-container');
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

    snackbarElement.html(message).fadeIn(500);
    snackbarElement.removeClass('error', 'success');
    snackbarElement.addClass(type);
    setTimeout(function() {
        snackbarElement.hide('slow');
    }, 3000);
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
 * Do an inline post.
 *
 * @param properties
 * @param type
 * @param element
 */
function doInlinePost(properties, type, element) {

    let token = configGet('token');
    let headers = {
        'Accept': 'application/json'
    };
    if (token !== undefined) {
        headers.Authorization = 'Bearer ' + token;
    }

    properties.h = 'entry';
    properties['post-status'] = 'published';

    $.ajax({
        type: 'POST',
        url: getMicropubEndpoint(),
        headers: headers,
        data: properties,
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    })
    .done(function() {
        let backgroundImage = 'images/button_' + type + '_pressed.png';
        element.css('background-image', 'url(' + backgroundImage + ')');
    })
    .fail(function() {
        snackbar('Something went wrong with this action', 'error');
    });
}

/**
 * Load channels.
 */
function loadChannels() {

    if (noConnection(false, '#channels-container')) {
        return;
    }

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
        let channels = $('#channels-container');

        $.each(data.channels, function(i, item) {
            let indicator = "";
            if (undefined !== item.unread) {
                if (typeof(item.unread) === "boolean") {
                    if (item.unread) {
                        indicator = '<span class="indicator channel-indicator-' + item.uid + '">New</span>'
                    }
                }
                else {
                    if (item.unread > 0) {
                        indicator = '<span class="indicator channel-indicator-' + item.uid + '">' + item.unread +  '</span>'
                    }
                }
            }
            let timeline_url = baseUrl + '?action=timeline&channel=' + item.uid;
            let channel = '<div class="channel" data-channel="' + item.uid + '" data-link="' + timeline_url + '">' + item.name + indicator + '</div>';
            channels.append(channel);
        });

        $('.channel').click(function() {
            clearContainer(".timeline-item");
            loadTimeline($(this).data('link'), "");
            currentChannel = $(this).data('channel');
        });

    })
    .fail(function() {
        snackbar('Something went wrong loading the channels', 'error');
    });

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
        // TODO fix this, although this works for Drupal, I guess other microsub servers behave differently.
        'last_read_entry': 'everything',
        'channel': currentChannel,
    };

    $.ajax({
        type: 'POST',
        url: baseUrl,
        data: data,
        headers: headers,
    })
    .done(function(data) {
        $('.new').hide();
        $('.channel-indicator-' + currentChannel).html("");
        snackbar('All items marked as read');
    })
    .fail(function() {
        snackbar('Something went wrong marking the timeline as read', 'error');
    });
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
        postIndex = 0;
    }

    let token = configGet('token');
    let headers = {
        'Accept': 'application/json'
    };
    if (token !== undefined) {
        headers.Authorization = 'Bearer ' + token;
    }

    let finalTimelineUrl = timelineUrl;
    if (after.length > 0) {
        finalTimelineUrl += '&after=' + after;
    }

    $.ajax({
        type: 'GET',
        url: finalTimelineUrl,
        headers: headers,
    })
    .done(function(data) {
        debug(data);

        hideContainer('#channels-container');
        showContainer('#timeline-container');

        // Posts.
        let postsContainer = $('#timeline-container .posts');
        let pagerContainer = $('#timeline-container .pager');
        $.each(data.items, function(i, item) {
            let renderedPost = renderPost(item);
            if (renderedPost.length > 0) {
                let post = '<div class="timeline-item post-' + postIndex + '">' + renderedPost + '</div>';
                postsContainer.append(post);
                postIndex++;
            }
        });

        // Pager.
        if (undefined !== data.paging && undefined !== data.paging.after) {
            pagerContainer.show();
            let next = '<span class="next">More posts</span>';
            pagerContainer.html(next);
            $('.next').on('click', function() {
                loadTimeline(timelineUrl, data.paging.after.toString());
            });
        }
        else {
            pagerContainer.hide();
        }

        // Inline actions.
        $('.action').on('click', function() {
            let url = $(this).parent().data('url');
            if (url.length > 0) {
                let type = $(this).data('action');
                let element = $(this);
                if (type === 'external') {
                    shell.openExternal(url);
                }
                else if (type === 'rsvp') {
                }
                else if (type === 'like' || type === 'repost' || type === 'bookmark') {
                    let prop = type + '-of';
                    let properties = {};
                    properties[prop] = url;
                    if (configGet(type + '_no_confirm')) {
                        doInlinePost(properties, type, element);
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
                                functionReady: function(instance, helper){
                                   $('.tooltip-confirm').on('click', function() {
                                       instance.close();
                                       doInlinePost(properties, type, element);
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
                            functionReady: function(instance, helper){
                                $('.tooltip-send').on('click', function() {
                                    if ($('.inline-textarea').val().length > 0) {
                                        instance.close();
                                        let prop = 'in-reply-to';
                                        let properties = {};
                                        properties[prop] = url;
                                        properties.content = $('.inline-textarea').val();
                                        doInlinePost(properties, type, element);
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

        // Catch all links in timeline-item.
        $('.timeline-item a').on('click', function(e) {
            e.preventDefault();
            shell.openExternal(this.href);
        });

        // Read more.
        $('.timeline-item .read-more').on('click', function() {
            let wrapper = $(this).parent().clone().html();
            $('.overlay-content').html(wrapper);
            hideContainer('.overlay-content .read-more');
            hideContainer('.overlay-content .actions');
            hideContainer('.overlay-content .content-truncated');
            showContainer('.overlay-content .content-full');
            showContainer('#overlay-container');
        });

    })
    .fail(function() {
        snackbar('Something went wrong loading the timeline', 'error');
    });

}

/**
 * Render a post.
 *
 * @param {Object} item
 *
 * return {string}
 */
function renderPost(item) {
    let post = "";
    let type = "entry";

    if (item.type !== undefined && item.type === "card") {
        return "";
    }

    // Author.
    let authorName = "";
    post += '<div class="author-wrapper">';
    if (item.author) {
        if (item.author.name && item.author.name.length > 0) {
            authorName = item.author.name;
        }
        else if (item.author.url && item.author.url.length > 0) {
            authorName = item.author.url;
        }

        if (item.author.photo) {
            post += '<div class="author-avatar"><img class="avatar" src="' + item.author.photo + '" width="80" height="80" /></div>';
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
        post += '<div class="author-name">' + authorName + '</div>';
    }

    // Published time.
    if (item.published) {
        post += '<div class="published-on">' + dayjs(item.published).format('DD/MM/YYYY HH:mm') + '</div>';
    }

    // Define a reference to check after content.
    let checkReference = "";

    // Post context, e. reply, repost or quotation.
    let types = {'like-of': 'Liked', 'repost-of': 'Reposted', 'quotation-of': 'Quoted', 'in-reply-to': 'Replied to'};
    $.each(types , function(index, val) {
        if (item[index]) {
            if (index === 'quotation-of' || index === 'in-reply-to') {
                checkReference = item[index];
            }
            post += '<div class="post-type">' + val + ' <a href="' + item[index] + '">' + item[index] + '</a></div>';
        }
    });

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
        if (content.length > 1000) {
            post += '<div class="content-truncated">' + content.substr(0, 300) + ' ...</div>';
            post += '<div class="content-full">' + content + ' ...</div>';
            post += '<div class="read-more"><span class="button">Read more</span></div>';
        }
        else {
            post += '<div class="content">' + content + '</div>';
        }
    }

    if (checkReference.length > 0 && undefined !== item.refs && undefined !== item.refs[checkReference]) {
        let ref = item.refs[checkReference];
        if (undefined !== ref.content) {
            if (ref.content.text) {
                post += '<div class="reference">' + ref.content.text + '</div>';
            }
        }

        if (undefined !== ref.photo) {
            for (let i = 0; i < ref.photo.length; i++) {
                post += '<div class="image"><img src="' + ref.photo[i] + '" /></div>';
            }
        }
    }

    if (item.photo !== undefined) {
        for (let i = 0; i < item.photo.length; i++) {
            post += '<div class="image"><img src="' + item.photo[i] + '" /></div>';
        }
    }

    if (item.video !== undefined) {
        post += '<div class="video"> <video controls> <source src="' + item.video[0] + '"> </video> </div>';
    }

    if (item.audio !== undefined) {
        post += '<div class="audio"> <audio controls> <source src="' + item.audio[0] + '"> </audio> </div>';
    }

    // Actions.
    if (!isDefaultMicrosubEndpoint() && item.url) {
        let url = "";
        if (item.url.length > 0) {
            url = item.url;
        }
        post += '<div class="actions" data-url="' + url + '">';
        post += '<div class="action action-reply" data-action="reply"></div>';
        post += '<div class="action action-like" data-action="like"></div>';
        post += '<div class="action action-repost" data-action="repost"></div>';
        post += '<div class="action action-bookmark" data-action="bookmark"></div>';
        post += '<div class="action action-external" data-action="external"></div>';
        if (type === "event") {
            post += '<div class="action action-rsvp" data-action="rsvp"></div>';
        }
        post += '</div>';
    }

    // Closing wrapper.
    post += '</div>';

    return post;
}