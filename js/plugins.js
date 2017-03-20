/*
 * This file contains the plugin definitions
 */

(function() {
'use strict';

var plugins = angular.module('plugins', []);

/*
 * Definition of a user provided plugin with sensible default values
 *
 * User plugins are created by providing a name and a contentForMessage
 * function that parses a string and returns any additional content.
 */
var Plugin = function(name, contentForMessage) {
    return {
        contentForMessage: contentForMessage,
        exclusive: false,
        name: name
    };
};


// Regular expression that detects URLs for UrlPlugin
var urlRegexp = /(?:(?:https?|ftp):\/\/|www\.|ftp\.)\S*[^\s.;,(){}<>]/g;
/*
 * Definition of a user provided plugin that consumes URLs
 *
 * URL plugins are created by providing a name and a function that
 * that parses a URL and returns any additional content.
 */
var UrlPlugin = function(name, urlCallback) {
    return {
        contentForMessage: function(message) {
            var urls = _.uniq(message.match(urlRegexp));
            var content = [];

            for (var i = 0; urls && i < urls.length; i++) {
                var result = urlCallback(urls[i]);
                if (result) {
                    content.push(result);
                }
            }
            return content;
        },
        exclusive: false,
        name: name
    };
};

/*
 * This service provides access to the plugin manager
 *
 * The plugin manager is where the various user provided plugins
 * are registered. It is responsible for finding additional content
 * to display when messages are received.
 *
 */
    plugins.service('plugins', ['userPlugins', '$sce', function(userPlugins, $sce) {

    /*
     * Defines the plugin manager object
     */
    var PluginManagerObject = function() {

        var plugins = [];

        /*
         * Register the user provides plugins
         *
         * @param userPlugins user provided plugins
         */
        var registerPlugins = function(userPlugins) {
            for (var i = 0; i < userPlugins.length; i++) {
                plugins.push(userPlugins[i]);
            }
        };

        var nsfwRegexp = new RegExp('nsfw', 'i');

        /*
         * Iterates through all the registered plugins
         * and run their contentForMessage function.
         */
        var contentForMessage = function(message) {
            message.metadata = [];
            var addPluginContent = function(content, pluginName, num) {
                if (num) {
                    pluginName += " " + num;
                }

                // If content isn't a callback, it's HTML
                if (!(content instanceof Function)) {
                    content = $sce.trustAsHtml(content);
                }

                message.metadata.push({
                    'content': content,
                    'nsfw': nsfw,
                    'name': pluginName
                });
            };

            for (var i = 0; i < plugins.length; i++) {

                var nsfw = false;
                if (message.text.match(nsfwRegexp)) {
                    nsfw = true;
                }

                var pluginContent = plugins[i].contentForMessage(
                    message.text
                );
                if (pluginContent && pluginContent !== []) {

                    if (pluginContent instanceof Array) {
                        for (var j = pluginContent.length - 1; j >= 0; j--) {
                            // only give a number if there are multiple embeds
                            var num = (pluginContent.length == 1) ? undefined : (j + 1);
                            addPluginContent(pluginContent[j], plugins[i].name, num);
                        }
                    } else {
                        addPluginContent(pluginContent, plugins[i].name);
                    }

                    if (plugins[i].exclusive) {
                        break;
                    }
                }
            }

            return message;
        };

        return {
            registerPlugins: registerPlugins,
            contentForMessage: contentForMessage
        };
    };

    // Instanciates and registers the plugin manager.
    this.PluginManager = new PluginManagerObject();
    this.PluginManager.registerPlugins(userPlugins.plugins);

}]);

/*
 * This factory exposes the collection of user provided plugins.
 *
 * To create your own plugin, you need to:
 *
 * 1. Define its contentForMessage function. The contentForMessage
 *    function takes a string as a parameter and returns a HTML string.
 *
 * 2. Instantiate a Plugin object with contentForMessage function as its
 *    argument.
 *
 * 3. Add it to the plugins array.
 *
 */
plugins.factory('userPlugins', function() {
    // standard JSONp origin policy trick
    var jsonp = function (url, callback) {
        var callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            callback(data);
        };

        var script = document.createElement('script');
        script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
        document.body.appendChild(script);
    };


    /*
     * Preview image, audio and video
     */
    var previewPlugin = new UrlPlugin('preview', function(url) {
        return function() {
            var self = this;

            var mimeDetectRequest = new XMLHttpRequest();
            mimeDetectRequest.open('GET', 'php/preview-url.php?url=' + encodeURIComponent(url), true);
            mimeDetectRequest.addEventListener('error', function() {
                // Do nothing.
            });

            mimeDetectRequest.addEventListener('load', function() {
                var info = JSON.parse(mimeDetectRequest.responseText);
                if (info.summary) {
                    showPreviewWebpage(url, info);
                } else if (/^image\/(?:bmp|gif|x-icon|jpeg|png|svg+xml|tiff|webp)$/.test(info.type)) {
                    showPreviewImage(url);
                } else if (/^audio\/(?:flac|m4a|midi|ogg|opus)$/.test(info.type)) {
                    showPreviewAudio(url);
                } else if (/^video\/(?:3gpp|avi|flv|matroska|mp4|ogv|webm)$/.test(info.type)) {
                    if (info.length && info.length < 2097152) {
                        // smaller than 2 MB
                        showPreviewVideo(url);
                    }
                }
            });

            mimeDetectRequest.send();

            function showPreviewWebpage(url, info) {
                var element = self.getElement();
                var summaryElement = angular.element('<div></div>')
                                            .addClass('embed-webpage-summary');
                summaryElement.append(angular.element('<a></a>')
                                             .addClass('embed-webpage-summary-title')
                                             .attr('rel', 'noopener noreferrer')
                                             .attr('target', '_blank')
                                             .attr('href', url)
                                             .text(info.summary.title || '(No Title)'));
                summaryElement.append(angular.element('<small></small>')
                                             .addClass('embed-webpage-summary-origin')
                                             .text(info.summary.origin));
                if (info.summary.description) {
                    summaryElement.append(angular.element('<blockquote></blockquote>')
                                                 .addClass('embed-webpage-summary-description')
                                                 .text(info.summary.description));
                }
                element.innerHTML = summaryElement.prop('outerHTML');
            }

            function showPreviewImage(url) {
                var element = self.getElement();
                var imgElem = angular.element('<img>')
                                     .addClass('embed')
                                     .attr('src', url);
                if (/sticker/i.test(element.parentElement.parentElement.parentElement.innerText)) {
                  // Smaller preview for stickers
                  imgElem.addClass('preview-sticker');
                }
                var anchorElem = angular.element('<a></a>')
                                     .attr('target', '_blank')
                                     .attr('href', url)
                                     .append(imgElem);
                element.innerHTML = anchorElem.prop('outerHTML');
            }

            function showPreviewAudio(url) {
                var element = self.getElement();
                var aelement = angular.element('<audio controls></audio>')
                                     .addClass('embed')
                                     .attr('width', '560')
                                     .append(angular.element('<source></source>')
                                                    .attr('src', url));
                element.innerHTML = aelement.prop('outerHTML');
            }

            function showPreviewVideo(url) {
                var element = self.getElement();
                var velement = angular.element('<video autoplay loop muted></video>')
                                     .addClass('embed')
                                     .attr('width', '560')
                                     .append(angular.element('<source></source>')
                                                    .attr('src', url));
                element.innerHTML = velement.prop('outerHTML');
            }
        };
    });


    return {
        plugins: [previewPlugin]
    };


});
})();
