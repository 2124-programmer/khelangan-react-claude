// Dynamic Expo config. Extends the static app.json so the only thing computed at
// build time is whether Android cleartext (plain-HTTP) traffic is allowed.
//
// Rule: cleartext is permitted ONLY when the API base URL is plain HTTP (local LAN
// dev against http://<ip>:8080). Any HTTPS target (UAT / production) ships with
// cleartext disabled, satisfying iOS ATS and keeping release builds secure.
const base = require('./app.json');

const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
const allowCleartext = apiUrl.startsWith('http://');

module.exports = () => {
  const expo = JSON.parse(JSON.stringify(base.expo));

  expo.plugins = expo.plugins.map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-build-properties') {
      const [name, opts] = plugin;
      return [
        name,
        {
          ...opts,
          android: { ...(opts.android || {}), usesCleartextTraffic: allowCleartext },
        },
      ];
    }
    return plugin;
  });

  return { expo };
};
