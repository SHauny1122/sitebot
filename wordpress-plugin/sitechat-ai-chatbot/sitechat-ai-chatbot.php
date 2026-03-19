<?php
/**
 * Plugin Name: SiteChat AI Chatbot
 * Plugin URI: https://sitebot-kappa.vercel.app
 * Description: Add your SiteChat bot to your WordPress site by setting a Bot ID.
 * Version: 1.0.0
 * Author: SiteChat
 * License: GPL2
 * Text Domain: sitechat-ai-chatbot
 */

if (!defined('ABSPATH')) {
    exit;
}

define('SITECHAT_OPTION_BOT_ID', 'sitechat_bot_id');

function sitechat_register_settings() {
    register_setting('sitechat_settings_group', SITECHAT_OPTION_BOT_ID, [
        'type' => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default' => ''
    ]);
}
add_action('admin_init', 'sitechat_register_settings');

function sitechat_admin_menu() {
    add_menu_page(
        'SiteChat Settings',
        'SiteChat',
        'manage_options',
        'sitechat-settings',
        'sitechat_render_settings_page',
        'dashicons-format-chat',
        59
    );
}
add_action('admin_menu', 'sitechat_admin_menu');

function sitechat_render_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    $bot_id = get_option(SITECHAT_OPTION_BOT_ID, '');
    ?>
    <div class="wrap">
        <h1>SiteChat Settings</h1>
        <form method="post" action="options.php">
            <?php settings_fields('sitechat_settings_group'); ?>
            <table class="form-table" role="presentation">
                <tbody>
                    <tr>
                        <th scope="row"><label for="sitechat-bot-id">Bot ID</label></th>
                        <td>
                            <input
                                name="<?php echo esc_attr(SITECHAT_OPTION_BOT_ID); ?>"
                                id="sitechat-bot-id"
                                type="text"
                                class="regular-text"
                                value="<?php echo esc_attr($bot_id); ?>"
                            />
                            <p class="description">Paste your SiteChat Bot ID and save.</p>
                        </td>
                    </tr>
                </tbody>
            </table>
            <?php submit_button('Save'); ?>
        </form>
    </div>
    <?php
}

function sitechat_inject_embed_script() {
    if (is_admin()) {
        return;
    }

    $bot_id = trim((string) get_option(SITECHAT_OPTION_BOT_ID, ''));
    if ($bot_id === '') {
        return;
    }

    $safe_bot_id = esc_attr($bot_id);
    echo '<script src="https://sitebot-kappa.vercel.app/embed.js" data-bot="' . $safe_bot_id . '"></script>';
}
add_action('wp_footer', 'sitechat_inject_embed_script');
