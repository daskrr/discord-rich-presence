const fs = require('fs');
const rpc = require('discord-rpc');
const { exit } = require('process');
const blankConfig = require('./config-blank.json');

module.exports = function richPresence() {
    // default config path (hard-coded)
    const configPath = './config.json';
    // check if config exists, if not make one
    if (!fs.existsSync(configPath)) {
        console.error('Config file missing. Creating a blank one...');

        fs.writeFileSync(configPath, JSON.stringify(blankConfig, null, 4));

        console.error('Exiting program');
        exit();
    }

    // write a dummy config with all possbile options
    if (!fs.existsSync('./config-dummy.json')) {
        fs.writeFileSync('./config-dummy.json', JSON.stringify(blankConfig, null, 4));
    }

    // open and parse config
    let configJSON = fs.readFileSync(configPath).toString() /* open the file as string */
    const config = JSON.parse(configJSON);

    // check required fields
    if (!config.Details || !config.State || !config.ClientID){
        console.error('Client ID, State or Details were not provided in the config. Exiting.');
        exit();
    }

    // create client
    const client = new rpc.Client({ transport: 'ipc' });

    // login with application id
    client.login({ clientId : config.ClientID }).catch((ex) => {
        if (!ex)
            return;

        console.log("-------------------------------");
        console.log("An error has occured whilst trying to login with the client ID.");
        console.log("It's verly likely that the client ID is invalid.");
        console.error(ex);
        console.log("-------------------------------");
    }); 

    client.on('ready', () => {
        // log all user settings
        console.log("-------------------------------");
        console.log('Discord Rich presence enabled')
        console.log(`Client ID: ${config.ClientID}`);
        console.log(`Details: ${config.Details}`);
        console.log(`State: ${config.State}`);

        // create activity object with required fields
        let activity = {
            details: config.Details,
            state: config.State,
        };

        // add optional fields, if any
        // time
        if (config.StartTimestamp) {
            activity.StartTimestamp = config.StartTimestamp;

            console.log(`Start Timestamp: ${config.StartTimestamp}`);
        }
        if (config.RandomTimestamp && config.MinTimestamp && config.MaxTimestamp) {
            activity.startTimestamp = new Date(new Date().getTime() - (Math.random() * (config.MaxTimestamp - config.MinTimestamp) + config.MinTimestamp));

            console.log('Random Timestamp Enabled');
            console.log(`Minimum Timestamp: ${config.MinTimestamp}`);
            console.log(`Minimum Timestamp: ${config.MaxTimestamp}`);
            console.log(`Randomly Generated Timestamp: ${activity.startTimestamp}`);
        }

        // images
        if (config.LargeImage) {
            activity.largeImageKey = config.LargeImage.Key;
            activity.largeImageText = config.LargeImage.Text;

            console.log(`Large Image: ${config.LargeImage.Key}`);
            console.log(`Large Image Text: ${config.LargeImage.Text}`);
        }
        if (config.SmallImage) {
            activity.smallImageKey = config.SmallImage.Key;
            activity.smallImageText = config.SmallImage.Text;

            console.log(`Small Image: ${config.SmallImage.Key}`);
            console.log(`Small Image Text: ${config.SmallImage.Text}`);
        }

        // buttons
        if (Array.isArray(config.Buttons)) {
            activity.buttons = [];

            for (let i = 0; i < config.Buttons.length; i++) {
                if (!config.Buttons[i].Text || !config.Buttons[i].Url)
                    continue;

                activity.buttons[i] = {
                    label: config.Buttons[i].Text,
                    url: config.Buttons[i].Url
                }

                console.log(`Button ${i} Text: ${config.Buttons[i].Text}`);
                console.log(`Button ${i} Url: ${config.Buttons[i].Url}`);
            }
        }

        // set activity
        client.setActivity(activity);

        console.log('Activity set!');
        console.log("-------------------------------");
    })
};