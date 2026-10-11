const { withMainActivity } = require("@expo/config-plugins");

module.exports = function withFlagSecure(config) {
    return withMainActivity(config, async (config) => {
        let content = config.modResults.contents;
        const isKotlin =
            config.modResults.language === "kt" ||
            content.includes("class MainActivity :");

        // 1. Add WindowManager import at top level after package declaration
        if (!content.includes("android.view.WindowManager")) {
            content = content.replace(
                /package\s+[^\r\n]+/,
                `$&\n\nimport android.view.WindowManager` +
                    (isKotlin ? "" : ";"),
            );
        }

        // 2. Inject FLAG_SECURE into onCreate method
        if (!content.includes("FLAG_SECURE")) {
            const flagCall = isKotlin
                ? "\n    window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)"
                : "\n    getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);";

            if (content.includes("super.onCreate(null)")) {
                content = content.replace(
                    "super.onCreate(null)",
                    `super.onCreate(null)${flagCall}`,
                );
            } else if (content.includes("super.onCreate(savedInstanceState)")) {
                content = content.replace(
                    "super.onCreate(savedInstanceState)",
                    `super.onCreate(savedInstanceState)${flagCall}`,
                );
            }
        }

        config.modResults.contents = content;
        return config;
    });
};
