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

        it('should recognize URLs', inject(function(plugins) {
            expectTheseMessagesToContain([
                'https://exmaple.com/',
            ],
            'preview',
            plugins);
        }));

    });
});
