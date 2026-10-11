const { withMainActivity } = require("@expo/config-plugins");

module.exports = function withFlagSecure(config) {
    return withMainActivity(config, async (config) => {
        let content = config.modResults.contents;

        // Add WindowManager import if not present
        if (!content.includes("android.view.WindowManager")) {
            content = content.replace(
                /package [^;]+;/,
                `$&\nimport android.view.WindowManager;`,
            );
        }

        const onCreateTarget = "super.onCreate(null);";
        const secureFlagCall =
            "\n    getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);";

        if (
            content.includes(onCreateTarget) &&
            !content.includes("FLAG_SECURE")
        ) {
            content = content.replace(
                onCreateTarget,
                `${onCreateTarget}${secureFlagCall}`,
            );
        }

        config.modResults.contents = content;
        return config;
    });
};
