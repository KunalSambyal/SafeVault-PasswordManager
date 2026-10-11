const { withGradleProperties } = require("@expo/config-plugins");

module.exports = function withArchitectureFilter(config) {
    return withGradleProperties(config, (config) => {
        // Remove existing reactNativeArchitectures property if present
        config.modResults = config.modResults.filter(
            (item) => item.key !== "reactNativeArchitectures",
        );

        // Target only physical Android devices: 32-bit (armeabi-v7a) and 64-bit (arm64-v8a)
        // Strips x86 and x86_64 emulator binaries to reduce APK file size
        config.modResults.push({
            type: "property",
            key: "reactNativeArchitectures",
            value: "armeabi-v7a,arm64-v8a",
        });

        return config;
    });
};
