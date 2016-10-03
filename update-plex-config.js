var fs = require('fs'),
    xml2js = require('xml2js'),
    prompt = require('prompt'),
    request = require('request');

var plexConfigurationDir = __dirname + '/configs/plex/Library/Application Support/Plex Media Server';
var plexConfigurationPath = plexConfigurationDir + '/Preferences.xml';

var xmlParser = new xml2js.Parser();

function getUsernamePassword(cb) {
    var schema = {
        properties: {
            name: {
                message: 'Plex username or email',
                required: true
            },
            password: {
                message: 'Plex password',
                hidden: true,
                required: true
            }
        }
    };

    prompt.start();

    prompt.get(schema, function (err, result) {
        if (err) return cb(err);

        cb(null, { username: result.name, password: result.password });
    });
}  

function getAuthToken(username, password, cb) {
    request.post({
        'url': 'https://plex.tv/users/sign_in.xml',
        'auth': {
            'user': username,
            'pass': password
        }, 
        headers: {
            'X-Plex-Device-Name': 'PlexMediaServer',
            'X-Plex-Provides': 'server',
            'X-Plex-Version': '0.9',
            'X-Plex-Platform-Version': '0.9',
            'X-Plex-Platform': 'xcid',
            'X-Plex-Product': 'Plex Media Server',
            'X-Plex-Device': 'Linux',
            'X-Plex-Client-Identifier': 'XXXX'
        }
    }, function(err,httpResponse,body){
        if (err) {
            cb(err);
            return;
        };

        xmlParser.parseString(body, function (err, result) {
            if (err) {
                cb(err);
                return;
            };

            cb(null, result.user['$'].authToken)
        });
    });
}

function setPlexConfiguration(options, cb) {
    fs.readFile(plexConfigurationPath, function(err, data) {
        if (err) {
            return cb(err);
        }

        xmlParser.parseString(data, function (err, result) {
            if (err) return cb(err);

            result.Preferences['$'].PlexOnlineToken = options.token;
            result.Preferences['$'].AcceptedEULA = "1";
            result.Preferences['$'].PublishServerOnPlexOnlineKey = "1";
            result.Preferences['$'].FriendlyName = "Blah";
            result.Preferences['$'].collectUsageData = "0";
            result.Preferences['$'].ButlerUpdateChannel = "8"; //8 = plex pass, 16 = public
            result.Preferences['$']. CertificateVersion= "2";
            //ManualPortMappingMode 1
            //ManualPortMappingPort $PLEX_EXTERNAL_PORT

            var builder = new xml2js.Builder();
            var xml = builder.buildObject(result);
            
            fs.writeFileSync(plexConfigurationPath + ".bak", data);
            fs.writeFileSync(plexConfigurationPath, xml);  

            cb(null);           
        });
    });
}

getUsernamePassword(function(err, result) {
    if (err) throw err;

    getAuthToken(result.username, result.password, function(err, token) {
        if (err) throw err;

        setPlexConfiguration({ token: token }, function(err) {
            if (err) throw err;
            
            console.log('Updated plex configuration');
            //TODO: restart plex application
        })
    });
});
 