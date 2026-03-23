const { withMainActivity } = require('@expo/config-plugins');

/**
 * Expo config plugin that adds HealthConnectPermissionDelegate.setPermissionDelegate(this)
 * to MainActivity.onCreate(). This is required by react-native-health-connect v3.x
 * to register the ActivityResultLauncher before any permission requests.
 * Without this, the lateinit property crashes the app on startup.
 */
const withHealthConnectPermissions = (config) => {
  return withMainActivity(config, (config) => {
    const mainActivity = config.modResults;

    // Add import if not present
    const importLine = 'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
    if (!mainActivity.contents.includes(importLine)) {
      // Add after the last import line
      mainActivity.contents = mainActivity.contents.replace(
        /(import .+\n)(?!import )/,
        `$1${importLine}\n`
      );
    }

    // Add setPermissionDelegate call in onCreate after super.onCreate
    const delegateCode = `
    // Health Connect: register permission delegate to avoid lateinit crash
    try {
      HealthConnectPermissionDelegate.setPermissionDelegate(this)
    } catch (e: Exception) {
      // Health Connect not available on this device
    }`;

    if (!mainActivity.contents.includes('setPermissionDelegate')) {
      mainActivity.contents = mainActivity.contents.replace(
        /super\.onCreate\(null\)/,
        `super.onCreate(null)${delegateCode}`
      );
    }

    return config;
  });
};

module.exports = withHealthConnectPermissions;
