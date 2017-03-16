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
     * Image Preview
     */
    var imagePlugin = new UrlPlugin('image', function(url) {
        if (url.match(/\.(bmp|gif|ico|jpeg|jpg|png|svg|svgz|tif|tiff|webp)(:(small|medium|large))?\b/i)) {
            /* A fukung.net URL may end by an image extension but is not a direct link. */
            if (url.indexOf("^https?://fukung.net/v/") != -1) {
                url = url.replace(/.*\//, "http://media.fukung.net/imgs/");
            } else if (url.match(/^http:\/\/(i\.)?imgur\.com\//i)) {
                // remove protocol specification to load over https if used by g-b
                url = url.replace(/http:/, "https:");
            } else if (url.match(/^https:\/\/www\.dropbox\.com\/s\/[a-z0-9]+\//i)) {
                // Dropbox requires a get parameter, dl=1
                var dbox_url = document.createElement("a");
                dbox_url.href = url;
                var base_url = dbox_url.protocol + '//' + dbox_url.host + dbox_url.pathname + '?';
                var dbox_params = dbox_url.search.substring(1).split('&');
                var dl_added = false;
                for (var i = 0; i < dbox_params.length; i++) {
                    if (dbox_params[i].split('=')[0] === "dl") {
                        dbox_params[i] = "dl=1";
                        dl_added = true;
                        // we continue looking at the other parameters in case
                        // it's specified twice or something
                    }
                }
                if (!dl_added) {
                    dbox_params.push("dl=1");
                }
                url = base_url + dbox_params.join('&');
            }
            return function() {
                var element = this.getElement();
                var imgElem = angular.element('<a></a>')
                                     .attr('target', '_blank')
                                     .attr('href', url)
                                     .append(angular.element('<img>')
                                                    .addClass('embed')
                                                    .attr('src', url));
                element.innerHTML = imgElem.prop('outerHTML');
            };
        }
    });

    /*
     * Audio Preview
     */
    var audioPlugin = new UrlPlugin('audio', function(url) {
        if (url.match(/\.(flac|m4a|mid|midi|mp3|oga|ogg|ogx|opus|pls|spx|wav|wave|wma)\b/i)) {
            return function() {
                var element = this.getElement();
                var aelement = angular.element('<audio controls></audio>')
                                     .addClass('embed')
                                     .attr('width', '560')
                                     .append(angular.element('<source></source>')
                                                    .attr('src', url));
                element.innerHTML = aelement.prop('outerHTML');
            };
        }
    });


    /*
     * Video Preview
     */
    var videoPlugin = new UrlPlugin('video', function(url) {
        if (url.match(/\.(3gp|avi|flv|gifv|mkv|mp4|ogv|webm|wmv)\b/i)) {
            if (url.match(/^http:\/\/(i\.)?imgur\.com\//i)) {
                // remove protocol specification to load over https if used by g-b
                url = url.replace(/\.(gifv)\b/i, ".webm");
            }
            return function() {
                var element = this.getElement();
                var velement = angular.element('<video autoplay loop muted></video>')
                                     .addClass('embed')
                                     .attr('width', '560')
                                     .append(angular.element('<source></source>')
                                                    .attr('src', url));
                element.innerHTML = velement.prop('outerHTML');
            };
        }
    });


 /* match giphy links and display the assocaited gif images
  * sample input:  http://giphy.com/gifs/eyes-shocked-bird-feqkVgjJpYtjy
  * sample output: https://media.giphy.com/media/feqkVgjJpYtjy/giphy.gif
  */
    var giphyPlugin = new UrlPlugin('Giphy', function(url) {
        var regex = /^https?:\/\/giphy\.com\/gifs\/.*-(.*)\/?/i;
        // on match, id will contain the entire url in [0] and the giphy id in [1]
        var id = url.match(regex);
        if (id) {
            var src = "https://media.giphy.com/media/" + id[1] + "/giphy.gif";
            return function() {
                var element = this.getElement();
                var gelement = angular.element('<a></a>')
                                     .attr('target', '_blank')
                                     .attr('href', url)
                                     .append(angular.element('<img>')
                                                    .addClass('embed')
                                                    .attr('src', src));
                element.innerHTML = gelement.prop('outerHTML');
            };
        }
    });

    var tweetPlugin = new UrlPlugin('Tweet', function(url) {
        var regexp = /^https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/i;
        var match = url.match(regexp);
        if (match) {
            url = 'https://api.twitter.com/1/statuses/oembed.json?id=' + match[2];
            return function() {
                var element = this.getElement();
                jsonp(url, function(data) {
                    // separate the HTML into content and script tag
                    var scriptIndex = data.html.indexOf("<script ");
                    var content = data.html.substr(0, scriptIndex);
                    // Set DNT (Do Not Track)
                    content = content.replace("<blockquote class=\"twitter-tweet\">", "<blockquote class=\"twitter-tweet\" data-dnt=\"true\">");
                    element.innerHTML = content;

                    // The script tag needs to be generated manually or the browser won't load it
                    var scriptElem = document.createElement('script');
                    // Hardcoding the URL here, I don't suppose it's going to change anytime soon
                    scriptElem.src = "https://platform.twitter.com/widgets.js";
                    element.appendChild(scriptElem);
                });
            };
        }
    });


    return {
        plugins: [imagePlugin, videoPlugin, audioPlugin, giphyPlugin, tweetPlugin]
    };


});
})();
