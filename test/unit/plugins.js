/* plugins go here */

var msg = function(msg) {
    return {'text': msg };
};

var metadata_name = function(message) {
    if (message.metadata && message.metadata[0] && message.metadata[0].name) {
        return message.metadata[0].name;
    }
    return null;
};

var expectTheseMessagesToContain = function(urls, pluginType, plugins) {
    for (var i = 0; i < urls.length; i++) {
        expect(
            metadata_name(
                plugins.PluginManager.contentForMessage(msg(urls[i]))
            )
        ).toEqual(pluginType);
    }
};

describe('filter', function() {
    beforeEach(module('plugins'));

    describe('Plugins', function() {
        beforeEach(module(function($provide) {
            $provide.value('version', 'TEST_VER');
        }));

        it('should recognize html5 videos', inject(function(plugins) {
            expectTheseMessagesToContain([
                'http://www.quirksmode.org/html5/videos/big_buck_bunny.mp4',
                'http://www.quirksmode.org/html5/videos/big_buck_bunny.webm',
                'http://www.quirksmode.org/html5/videos/big_buck_bunny.ogv',
            ],
            'video',
            plugins);
        }));

        it('should recognize images', inject(function(plugins) {
            expectTheseMessagesToContain([
                'http://i.imgur.com/BTNIDBR.gif',
                'https://i.imgur.com/1LmDmct.jpg',
                'http://i.imgur.com/r4FKrnu.jpeg',
                'https://4z2.de/gb-mobile-new.png',
                'http://static.weechat.org/images/screenshots/relay/medium/glowing-bear.png',
                'http://foo.bar/baz.php?img=trololo.png&dummy=yes',
                'https://tro.lo.lo/images/rick.png?size=123x45',
                'https://pbs.twimg.com/media/B66rbCuIMAAxiFF.jpg:large',
                'https://pbs.twimg.com/media/B6OZuCYCEAEV8SA.jpg:medium'
            ],
            'image',
            plugins);
        }));

        it('should recognize giphy gifs', inject(function(plugins) {
            expectTheseMessagesToContain([
                'https://giphy.com/gifs/eyes-shocked-bird-feqkVgjJpYtjy/',
                'http://giphy.com/gifs/funny-cat-FiGiRei2ICzzG',
            ],
            'Giphy',
            plugins);
        }));

        it('should recognize tweets', inject(function(plugins) {
            expectTheseMessagesToContain([
                'https://twitter.com/DFB_Team_EN/statuses/488436782959448065',
            ],
            'Tweet',
            plugins);
        }));

    });
});
