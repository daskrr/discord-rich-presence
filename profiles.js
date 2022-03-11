const rpc = require('discord-rpc');
const promptSync = require('prompt-sync')({sigint: true});
const { saveConfig } = require('./config.js');

// multi-line
const prompt = (text, fallback) => {
    console.log(text);
    return promptSync('> ', fallback);
}

module.exports = {
    newProfile: (config) => {
        let profile = {};
        let name = prompt('Type a name for the new profile:', 'New Profile');

        // check name against 'new' and 'delete'
        (function checkNameReserved(name) {
            if (name == 'new' || name.startsWith('delete')) {
                name = prompt('The name uses a reserved keyword. Type another one:', 'New Profile');
                checkNameReserved(name);
            }
        })(name);

        // check if name exists already
        let profiles = config.profiles;
        (function checkName (name, profiles) {
            if (profiles.hasOwnProperty(name)) {
                name = prompt('This name is already in use. Choose another one:');
                checkName(name, profiles);
            }
            return name;
        })(name, profiles);

        // query the user for the data
        profile.ClientID = prompt('Discord Application "Client Id":', '');
        profile.Details = prompt('Details:', '');
        profile.State = prompt('State:', '');
        profile.StartTimestamp = prompt('Would you like to show a timestamp of how long you have been playing for? (y/n)', 'y') == 'y' ? 0 : -1;
        profile.RandomTimestamp = prompt('Would you like a random timestamp to be generated for you every time you open your rich presence? (y/n)', 'n') == 'y';

        console.log('You may leave the following blank if you do not want to show them.');
        profile.LargeImage = {};
        profile.SmallImage = {};
        profile.Buttons = [{}, {}];

        profile.LargeImage.Key = prompt('Large Image Key:', false);
        profile.LargeImage.Text = prompt('Large Image Hover Text:', false);

        profile.SmallImage.Key = prompt('Small Image Key:', false);
        profile.SmallImage.Text = prompt('Small Image Hover Text:', false);

        profile.Buttons[0].Text = prompt('Button 0 Text:', false);
        profile.Buttons[0].Url = prompt('Button 0 Url:', false);

        profile.Buttons[1].Text = prompt('Button 1 Text:', false);
        profile.Buttons[1].Url = prompt('Button 1 Url:', false);

        // store collected data
        config.profiles[name] = profile;

        // save config
        saveConfig(config);
    },
    getProfile: (config, profile) => {
        return config.profiles[profile];
    },
    profileQuestion: (config, select = true, callback = null) => {
        // show a list of profiles to the user.
        console.log('Your Profiles:');
        let list = Object.keys(config.profiles);
        for (let profile of list)
            console.log(`  - ${profile}`);

        console.log("  > new");
        console.log("  > delete <profile>");
        if (!select)
            console.log('  > exit');

        // prompt the user with the selection
        let selected;

        if (select)
            selected = prompt('Select a profile from the above list:');
        else
            selected = prompt('Select a command from the above list:');

        // delete profile
        if (selected.startsWith('delete')) {
            let arg = selected.split(' ')[1];

            // check if it is valid
            if (!arg)
                console.log('The selected profile for deletion is invalid. Type the command again.');

            // check if it exists
            (function checkSelected(selected, list) {
                if (!list.includes(selected)) {
                    let selected = prompt('The selected profile does not exist. Type it again:');
                    checkSelected(selected, list);
                }
            })(arg, list);

            let sure = prompt(`Are you sure you want to delete ${arg}? (y/n)`, 'y') == 'y';

            if (sure) {
                // delete it
                delete config.profiles[arg];

                // save config
                saveConfig(config);

                console.log(`${arg} has been deleted.`);
            }
            else
                console.log(`${arg} has not been deleted.`);

            if (callback == null)
                return module.exports.profileQuestion(config);
            else {
                callback();
                return;
            }
        }

        // make new profile
        if (selected == 'new') {
            module.exports.newProfile(config);

            // after new profile completion ask again / callback
            if (callback == null)
                return module.exports.profileQuestion(config);
            else {
                callback();
                return;
            }
        }

        if (!select && selected == 'exit' && callback) {
            console.log('Returning to the previous menu.');
            callback();

            return;
        }

        if (select) {
            // check profile availability
            (function checkSelected(selected, list) {
                if (!list.includes(selected)) {
                    let selected = prompt('The selected profile does not exist. Type it again:');
                    checkSelected(selected, list);
                }
            })(selected, list);

            return module.exports.getProfile(config, selected);
        }
        else {
            console.log('You cannot select a profile whilst one is already running. Use \'exit\' to leave this menu, then \'stop\' to exit your currently running profile.');
            return module.exports.profileQuestion(config, false, callback);
        }
    },
    loadProfile: (config, profile) => {
        // check required fields
        if (!profile.Details || !profile.State || !profile.ClientID) {
            console.error('Client ID, State or Details were not provided in the config.');
            module.exports.loadProfile(config, module.exports.profileQuestion(config));

            return;
        }

        // create client
        const client = new rpc.Client({ transport: 'ipc' });

        // login with application id
        client.login({ clientId : profile.ClientID }).catch((ex) => {
            if (!ex)
                return;

            console.log("-------------------------------");
            console.log("An error has occured whilst trying to login with the client ID.");
            console.log("It's verly likely that the client ID is invalid.");
            console.error(ex);
            console.log("-------------------------------");

            module.exports.loadProfile(config, module.exports.profileQuestion(config));
        }); 

        client.on('ready', () => {
            // log all user settings
            console.log("-------------------------------");
            console.log('Discord Rich presence enabled')
            console.log(`Client ID: ${profile.ClientID}`);
            console.log(`Details: ${profile.Details}`);
            console.log(`State: ${profile.State}`);

            // create activity object with required fields
            let activity = {
                details: profile.Details,
                state: profile.State,
                instance: false,
            };

            // add optional fields, if any
            // time
            if (profile.StartTimestamp && profile.StartTimestamp != -1 && !profile.RandomTimestamp) {
                activity.StartTimestamp = profile.StartTimestamp;

                console.log(`Start Timestamp: ${profile.StartTimestamp}`);
            }
            if (profile.RandomTimestamp) {
                activity.startTimestamp = new Date(new Date().getTime() - (Math.random() * (36000000 - 36000) + 36000));

                console.log('Random Timestamp Enabled');
                console.log(`Randomly Generated Timestamp: ${activity.startTimestamp}`);
            }

            // images
            if (profile.LargeImage.Key && profile.LargeImage.Text) {
                activity.largeImageKey = profile.LargeImage.Key;
                activity.largeImageText = profile.LargeImage.Text;

                console.log(`Large Image: ${profile.LargeImage.Key}`);
                console.log(`Large Image Text: ${profile.LargeImage.Text}`);
            }
            if (profile.SmallImage.Key && profile.SmallImage.Text) {
                activity.smallImageKey = profile.SmallImage.Key;
                activity.smallImageText = profile.SmallImage.Text;

                console.log(`Small Image: ${profile.SmallImage.Key}`);
                console.log(`Small Image Text: ${profile.SmallImage.Text}`);
            }

            // buttons
            if (Array.isArray(profile.Buttons)) {
                activity.buttons = [];

                for (let i = 0; i < profile.Buttons.length; i++) {
                    if (!profile.Buttons[i].Text || !profile.Buttons[i].Url)
                        continue;

                    activity.buttons[i] = {
                        label: profile.Buttons[i].Text,
                        url: profile.Buttons[i].Url
                    }

                    console.log(`Button ${i} Text: ${profile.Buttons[i].Text}`);
                    console.log(`Button ${i} Url: ${profile.Buttons[i].Url}`);
                }

                // remove if empty
                if (activity.buttons.length == 0)
                    delete activity.buttons;
            }

            // set activity
            client.setActivity(activity);

            console.log('Activity set!');
            console.log("-------------------------------");

            module.exports.standbyListen(config, profile, client);
        });
    },
    standbyListen: (config, profile, client) => {
        let command = prompt('Use \'stop\' to end the rich presence, \'profiles\' to access your profile list, Ctrl/Cmd + C to exit the app.');

        if (command == 'stop') {
            client.clearActivity().then(() => {
                client.destroy().then(() => {
                    module.exports.loadProfile(config, module.exports.profileQuestion(config));
                });
            });
        }
        else if (command == 'profiles') {
            module.exports.profileQuestion(config, false, () => {
                module.exports.standbyListen(config, profile, client);
            });
        }
        else {
            console.log('Unknown command. Use \'stop\' to end the rich presence, \'profiles\' to access your profile list, Ctrl/Cmd + C (or the X button) to exit the app.');
            module.exports.standbyListen(config, profile, client);
        }
    }
}