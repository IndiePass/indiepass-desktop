
$(document).ready(function() {
    loadChannels();

    $('.back-to-channels').on('click', function() {
       hideContainer('#timeline-container');
       showContainer('#channels-container');
    });
});

/**
 * Return base url.
 *
 * @returns {string}
 */
function getBaseUrl() {
    return "https://indigenous.realize.be/indieweb/microsub";
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

    $.get(getBaseUrl() + "?action=channels", function(data) {

        let channels = $('#channels-container');

        $.each(data.channels, function(i, item) {
            let timeline_url = getBaseUrl() + '?action=timeline&channel=' + item.uid;
            let channel = '<div class="channel" data-link="' + timeline_url + '">' + item.name + '</div>';
            channels.append(channel);
        });

        $('.channel').click(function(e) {
            loadTimeline($(this).data('link'));
        });

    })
    .fail(function() {
        console.log('oops')
    });

}

/**
 * Load a timeline.
 *
 * @param timelineUrl
 *   The timeline URL.
 */
function loadTimeline(timelineUrl) {

    $.get(timelineUrl, function(data) {
        hideContainer('#channels-container');
        clearContainer(".timeline-item");
        showContainer('#timeline-container');

        let timeline = $('#timeline-container');

        $.each(data.items, function(i, item) {
           console.log(item);
           let post = '<div class="timeline-item">' + renderPost(item) + '</div>';
           timeline.append(post);
        });

    })
    .fail(function() {
        console.log('oops')
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

    if (item.name) {
        post += '<div class="title">' + item.name + '</div>';
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

    return post;
}