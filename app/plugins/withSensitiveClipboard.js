const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withSensitiveClipboard(config) {
    return withDangerousMod(config, [
        "android",
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const clipboardModulePath = path.join(
                projectRoot,
                "node_modules",
                "expo-clipboard",
                "android",
                "src",
                "main",
                "java",
                "expo",
                "modules",
                "clipboard",
                "ClipboardModule.kt",
            );

            if (fs.existsSync(clipboardModulePath)) {
                let content = fs.readFileSync(clipboardModulePath, "utf8");

                // 1. Clear clipboard cleanly using clearPrimaryClip() on Android 9+ (API 28+)
                const targetHeader =
                    'AsyncFunction("setStringAsync") { content: String, options: SetStringOptions ->';
                const clearPatch = `AsyncFunction("setStringAsync") { content: String, options: SetStringOptions ->
      if (content.isEmpty() && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
        clipboardManager.clearPrimaryClip()
        return@AsyncFunction true
      }`;

                if (
                    content.includes(targetHeader) &&
                    !content.includes("clearPrimaryClip()")
                ) {
                    content = content.replace(targetHeader, clearPatch);
                }

                // 2. Inject EXTRA_IS_SENSITIVE on Android 13+ to prevent keyboard history caching
                if (!content.includes("EXTRA_IS_SENSITIVE")) {
                    const targetCode = "clipboardManager.setPrimaryClip(clip)";
                    const sensitivePatch = `if (content.isNotEmpty() && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
        clip.description.extras = android.os.PersistableBundle().apply {
          putBoolean(android.content.ClipDescription.EXTRA_IS_SENSITIVE, true)
        }
      }
      clipboardManager.setPrimaryClip(clip)`;

                    content = content.replace(targetCode, sensitivePatch);
                }

                fs.writeFileSync(clipboardModulePath, content, "utf8");
            }

            return config;
        },
    ]);
};
