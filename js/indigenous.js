const Store = require('electron-store');
const store = new Store();

function getElement(element) {
    return store.get(element);
}

function setElement(name, value) {
    store.set(name, value);
}

$(document).ready(function() {

    loadChannels();

    $('.back-to-channels').on('click', function() {
       hideContainer('#timeline-container');
       hideContainer('#posts-container');
       hideContainer('#accounts-container');
       showContainer('#channels-container');
    });

    $('.reader').on('click', function() {
        hideContainer('#accounts-container');
        hideContainer('#timeline-container');
        hideContainer('#posts-container');
        showContainer('#channels-container');
    });

    $('.accounts').on('click', function() {
        hideContainer('#channels-container');
        hideContainer('#timeline-container');
        hideContainer('#posts-container');
        showContainer('#accounts-container');
    });

    $('.post').on('click', function() {
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

               let data = {
                 'h': 'entry',
                 'post-status': 'draft',
                 'content': $('#post-content').val(),
               };

               $.ajax({
                   type: 'POST',
                   url: micropubEndpoint,
                   headers: headers,
                   data: data,
                   contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
               })
               .done(function(data) {
                   $('#post-content').val("");
                   alert('Post created!');
               })
               .fail(function() {
                    alert('crap');
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
                        indicator = '<span class="indicator">New</span>'
                    }
                }
                else {
                    if (item.unread > 0) {
                        indicator = '<span class="indicator">' + item.unread +  '</span>'
                    }
                }
            }
            let timeline_url = baseUrl + '?action=timeline&channel=' + item.uid;
            let channel = '<div class="channel" data-link="' + timeline_url + '">' + item.name + indicator + '</div>';
            channels.append(channel);
        });

        $('.channel').click(function(e) {
            loadTimeline($(this).data('link'));
        });

    })
    .fail(function() {

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

    })
    .fail(function() {
    });

}

/**
 * Render a post.
 *
 * @param item
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

    // Closing wrapper.
    post += '</div>';

    return post;
}