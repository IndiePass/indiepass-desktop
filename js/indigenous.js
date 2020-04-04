const Store = require('electron-store');
const store = new Store();
const shell = require('electron').shell;

let snackbarElement;
let refreshChannels = false;
let currentChannel = 0;
let tokenInfoAdded = false;
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
 * Remove config
 *
 * @param name
 */
function configDelete(name) {
    store.clear(name);
}

$(document).ready(function() {

    snackbarElement = $('.snackbar');

    loadChannels();

    if (isDefaultMicrosubEndpoint()) {
        $('.mark-read').hide();
    }
    else {
        $('.mark-read').on('click', function() {
            markRead();
        });
    }

    $('.back-to-channels').on('click', function() {
       hideContainer('#timeline-container');
       hideContainer('#posts-container');
       hideContainer('#settings-container');
       showContainer('#channels-container');
    });

    $('.reader').on('click', function() {
        if (refreshChannels) {
            $('.channel').remove();
            refreshChannels = false;
            loadChannels();
        }
        $('.menu').removeClass('selected');
        $('.reader').addClass('selected');
        hideContainer('#settings-container');
        hideContainer('#timeline-container');
        hideContainer('#posts-container');
        showContainer('#channels-container');
    });

    $('.settings').on('click', function() {
        $('.menu').removeClass('selected');
        $('.settings').addClass('selected');
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

        if (configGet('like_no_confirm')) {
            $('#like-direct').prop('checked', true);
        }
        if (configGet('repost_no_confirm')) {
            $('#repost-direct').prop('checked', true);
        }
        if (configGet('bookmark_no_confirm')) {
            $('#bookmark-direct').prop('checked', true);
        }

    });

    $('.post').on('click', function() {
        $('.menu').removeClass('selected');
        $('.post').addClass('selected');
        hideContainer('#channels-container');
        hideContainer('#timeline-container');
        hideContainer('#settings-container');
        showContainer('#posts-container');
    });

    $('.save-settings').on('click', function() {

        configSave('like_no_confirm', $('#like-direct').is(':checked'));
        configSave('repost_no_confirm', $('#repost-direct').is(':checked'));
        configSave('bookmark_no_confirm', $('#bookmark-direct').is(':checked'));

        let micropub = $('#micropub-endpoint').val();
        if (micropub !== undefined && micropub.length > 0) {
            configSave('micropub_endpoint', micropub);
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
        configDelete('token');
        snackbar('Settings have been reset to default');
    });

    $('.send-post').on('click', function() {
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
               if ($('#published').is(':checked')) {
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
        hideContainer('#channels-container');
        showContainer('#timeline-container');

        // Posts.
        let postsContainer = $('#timeline-container .posts');
        let pagerContainer = $('#timeline-container .pager');
        $.each(data.items, function(i, item) {
           let post = '<div class="timeline-item">' + renderPost(item) + '</div>';
            postsContainer.append(post);
        });

        // Pager.
        if (undefined !== data.paging && undefined !== data.paging.after) {
            let next = '<span class="next">More posts</span>';
            pagerContainer.html(next);
            $('.next').on('click', function() {
                loadTimeline(timelineUrl, data.paging.after.toString());
            });
        }
        else {
            pagerContainer.remove();
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
        post += '<div class="published-on">' + item.published + '</div>';
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

    let hasContent = false;
    if (item.content !== undefined) {
        if (item.content.html !== undefined) {
            hasContent = true;
            post += '<div class="content">' + item.content.html + '</div>';
        }
        else if (item.content.text !== undefined) {
            hasContent = true;
            post += '<div class="content">' + item.content.text + '</div>';
        }
    }

    if (!hasContent && item.summary !== undefined) {
        post += '<div class="content">' + item.summary + '</div>';
    }

    if (checkReference.length > 0 && undefined !== item.refs && undefined !== item.refs[checkReference]) {
        let ref = item.refs[checkReference];
        if (undefined !== ref.content) {
            if (ref.content.text) {
                post += '<div class="reference">' + ref.content.text + '</div>';
            }
        }
    }

    if (item.photo !== undefined) {
        post += '<div class="image"><img src="' + item.photo[0] + '" /></div>';
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
        post += '</div>';
    }

    // Closing wrapper.
    post += '</div>';

    return post;
}