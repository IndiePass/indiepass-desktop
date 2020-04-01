const Store = require('electron-store');
const store = new Store();

let currentChannel = 0;
let tokenInfoAdded = false;

function getElement(element) {
    return store.get(element);
}

function setElement(name, value) {
    store.set(name, value);
}

$(document).ready(function() {

    loadChannels();

    $('.mark-read').on('click', function() {
        markRead();
    });

    $('.back-to-channels').on('click', function() {
       hideContainer('#timeline-container');
       hideContainer('#posts-container');
       hideContainer('#accounts-container');
       showContainer('#channels-container');
    });

    $('.reader').on('click', function() {
        $('.menu').removeClass('selected');
        $('.reader').addClass('selected');
        hideContainer('#accounts-container');
        hideContainer('#timeline-container');
        hideContainer('#posts-container');
        showContainer('#channels-container');
    });

    $('.accounts').on('click', function() {
        $('.menu').removeClass('selected');
        $('.accounts').addClass('selected');
        hideContainer('#channels-container');
        hideContainer('#timeline-container');
        hideContainer('#posts-container');
        showContainer('#accounts-container');

        if (!tokenInfoAdded) {
            tokenInfoAdded = true;
            let token = getElement('token');
            if (token !== undefined) {
                $(".token-description").append('<br />').append("A token has been saved. Enter a new one to replace it.");
            }
        }
        $('#micropub-endpoint').val(getMicrosubBaseUrl());
        $('#microsub-endpoint').val(getMicrosubBaseUrl());
    });

    $('.post').on('click', function() {
        $('.menu').removeClass('selected');
        $('.post').addClass('selected');
        hideContainer('#channels-container');
        hideContainer('#timeline-container');
        hideContainer('#accounts-container');
        showContainer('#posts-container');
    });

    $('.save-account').on('click', function() {
        let micropub = $('#micropub-endpoint').val();
        if (micropub !== undefined && micropub.length > 0) {
            setElement('micropub_endpoint', micropub);
        }

        let microsub = $('#microsub-endpoint').val();
        if (microsub !== undefined && microsub.length > 0) {
            setElement('microsub_endpoint', microsub);
        }

        let token = $('#token').val();
        if (token !== undefined && token.length > 0) {
            tokenInfoAdded = false;
            setElement('token', token);
        }
    });

    $('.send-post').on('click', function() {
       let micropubEndpoint = getMicropubBaseUrl();
       if (micropubEndpoint.length > 0) {
           if ($('#post-content').val().length > 0) {

               let token = getElement('token');
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
                   alert('Post created!');
               })
               .fail(function() {
                   // TODO error message.
               });
           }
           else {
               alert('Please add some content');
           }
       }
       else {
           alert('Please configure a micropub endpoint in Accounts');
       }
    });

});

/**
 * Return the microsub base url.
 *
 * @returns {string}
 */
function getMicrosubBaseUrl() {
    let microsub_endpoint = getElement('microsub_endpoint');
    if (microsub_endpoint !== undefined) {
        return microsub_endpoint;
    }
    else {
        return "https://indigenous.realize.be/indieweb/microsub";
    }
}

/**
 * Return the micropub base url.
 *
 * @returns {string}
 */
function getMicropubBaseUrl() {
    let micropub_endpoint = getElement('micropub_endpoint');
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
 * Load channels.
 */
function loadChannels() {

    let baseUrl = getMicrosubBaseUrl();
    let token = getElement('token');
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
            loadTimeline($(this).data('link'));
            currentChannel = $(this).data('channel');
        });

    })
    .fail(function() {

    });

}

/**
 * Mark read.
 */
function markRead() {
    let baseUrl = getMicrosubBaseUrl();
    let token = getElement('token');
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
    })
    .fail(function() {
        // TODO fail message.
    });
}

/**
 * Load a timeline.
 *
 * @param timelineUrl
 *   The timeline URL.
 */
function loadTimeline(timelineUrl) {

    let token = getElement('token');
    let headers = {
        'Accept': 'application/json'
    };
    if (token !== undefined) {
        headers.Authorization = 'Bearer ' + token;
    }
    $.ajax({
        type: 'GET',
        url: timelineUrl,
        headers: headers,
    })
    .done(function(data) {
        hideContainer('#channels-container');
        clearContainer(".timeline-item");
        showContainer('#timeline-container');

        let timeline = $('#timeline-container');

        $.each(data.items, function(i, item) {
           //console.log(item);
           let post = '<div class="timeline-item">' + renderPost(item) + '</div>';
           timeline.append(post);
        });

        $('.action').on('click', function() {
            let url = $(this).parent().data('url');
            if (url.length > 0) {
                alert('coming soon');
            }
        });

    })
    .fail(function() {
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
    if (item.author && item.author.name && item.author.name.length > 0) {
        authorName = item.author.name;
        if (item.author.photo) {
            post += '<div class="author-avatar"><img class="avatar" src="' + item.author.photo + '" width="80" height="80" /></div>';
        }
        else {
            post += '<div class="author-avatar"><img class="avatar" src="./images/avatar_small.png" width="80" height="80" /></div>';
        }
    }

    if (item._is_read === false) {
        post += '<div class="new">New</div>'
    }

    post += '</div>';

    // Content wrapper.
    post += '<div class="post-content-wrapper">';

    if (item.name) {
        post += '<div class="title">' + item.name + '</div>';
    }

    if (authorName.length > 0) {
        post += '<div class="author-name">' + authorName + '</div>';
    }

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
    let url = "";
    if (item.url.length > 0) {
        url = item.url;
    }
    post += '<div class="actions" data-url="' + url + '">';
    post += '<div class="action" data-action="reply"><img src="./images/button_reply_idle.png" width="30" /></div>';
    post += '<div class="action" data-action="like"><img src="./images/button_like_idle.png" width="30" /></div>';
    post += '<div class="action" data-action="repost"><img src="./images/button_repost_idle.png" width="30" /></div>';
    post += '</div>';

    // Closing wrapper.
    post += '</div>';

    return post;
}