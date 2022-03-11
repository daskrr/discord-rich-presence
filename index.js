const { configSetup } = require('./config.js');
const ProfileManager = require('./profiles.js');

module.exports = function richPresence() {
    // welcome message
    console.log('*========================================================================================*');
    console.log('|                      Welcome to Discord Rich Presence Customizer                       |');
    console.log('|                                                                                        |')
    console.log('|  You can go to -> https://discord.com/developers/applications to make an application.  |');
    console.log('*========================================================================================*');

    // set up config or read
    const config = configSetup();

    // check if there are any profiles
    if (Object.entries(config.profiles).length == 0)
        // force user to create a profile if there aren't any
        ProfileManager.newProfile(config);

    // ask user to select a profile
    let selectedProfile = ProfileManager.profileQuestion(config);

    // set activity
    ProfileManager.loadProfile(config, selectedProfile);
};