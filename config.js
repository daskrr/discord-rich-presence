const fs = require('fs');

// default config path (hard-coded)
const configPath = './config.json';

const defaultConfig = {
    profiles: {},
};

module.exports = {
    configSetup: () => {
        // check if config exists, if not make one
        if (!fs.existsSync(configPath)) {
            console.error('Config file missing. Creating a blank one...');

            fs.writeFileSync(configPath, JSON.stringify(defaultConfig));
        }

        // open and parse config
        let configJSON = fs.readFileSync(configPath).toString();

        // check if config has profiles
        let config = JSON.parse(configJSON);
        if (typeof config.profiles === 'undefined') {
            console.error('Config file invalid');
            config = JSON.parse(module.exports.rewriteConfig());
        }

        return config;
    },
    rewriteConfig: () => {
        // save old config file
        if (fs.existsSync(configPath)) {
            console.log('Saving old config file...');
            let oldConfig = fs.readFileSync(configPath).toString();
            fs.writeFileSync('./config_old.json', oldConfig);
        }

        // rewrite config file
        console.log('Rewriting config file...');
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig));

        return JSON.stringify(defaultConfig);
    },
    saveConfig: (config) => {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    }
}