import { env } from "@/lib/env";

export async function GET() {
  const apiOrigin = env.NEXT_PUBLIC_SITE_URL;

  const script = `(function(){
    var currentScript = document.currentScript;
    var botId = currentScript && currentScript.getAttribute('data-bot');
    if (!botId) return;

    var defaults = {
      buttonText: 'Chat',
      buttonColor: '#0d9488',
      buttonStyle: 'circle',
      headerColor: '#0d9488',
      widgetTitle: 'SiteChat',
      welcomeMessage: 'Hi! How can I help you today?',
      position: 'bottom-right'
    };

    function isHexColor(value) {
      return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
    }

    function normalizeAppearance(value) {
      var source = value && typeof value === 'object' ? value : {};
      var buttonStyle = source.buttonStyle === 'pill' || source.buttonStyle === 'rounded' ? source.buttonStyle : 'circle';
      var position = source.position === 'bottom-left' ? 'bottom-left' : 'bottom-right';

      return {
        buttonText: typeof source.buttonText === 'string' && source.buttonText.trim() ? source.buttonText.trim() : defaults.buttonText,
        buttonColor: isHexColor(source.buttonColor) ? source.buttonColor : defaults.buttonColor,
        buttonStyle: buttonStyle,
        headerColor: isHexColor(source.headerColor) ? source.headerColor : defaults.headerColor,
        widgetTitle: typeof source.widgetTitle === 'string' && source.widgetTitle.trim() ? source.widgetTitle.trim() : defaults.widgetTitle,
        welcomeMessage: typeof source.welcomeMessage === 'string' && source.welcomeMessage.trim() ? source.welcomeMessage.trim() : defaults.welcomeMessage,
        position: position
      };
    }

    function applyButtonStyle(button, style) {
      if (style === 'pill') {
        button.style.height = '50px';
        button.style.minWidth = '112px';
        button.style.padding = '0 20px';
        button.style.borderRadius = '999px';
        return;
      }

      if (style === 'rounded') {
        button.style.height = '50px';
        button.style.minWidth = '112px';
        button.style.padding = '0 18px';
        button.style.borderRadius = '14px';
        return;
      }

      button.style.width = '60px';
      button.style.height = '60px';
      button.style.padding = '0';
      button.style.borderRadius = '999px';
    }

    function applyPosition(container, position) {
      container.style.bottom = '20px';
      container.style.left = '';
      container.style.right = '';

      if (position === 'bottom-left') {
        container.style.left = '20px';
        return;
      }

      container.style.right = '20px';
    }

    (async function(){
      var appearance = defaults;

      try {
        var settingsResponse = await fetch('${apiOrigin}/api/bots/' + encodeURIComponent(botId) + '/appearance');
        if (settingsResponse.ok) {
          var settingsData = await settingsResponse.json();
          appearance = normalizeAppearance(settingsData && settingsData.appearance ? settingsData.appearance : {});
        }
      } catch (_) {
        appearance = defaults;
      }

      var container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.zIndex = '999999';
      applyPosition(container, appearance.position);

      var button = document.createElement('button');
      button.innerText = appearance.buttonText;
      button.style.border = 'none';
      button.style.background = appearance.buttonColor;
      button.style.color = '#fff';
      button.style.fontWeight = '600';
      button.style.cursor = 'pointer';
      button.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
      applyButtonStyle(button, appearance.buttonStyle);

      var panel = document.createElement('div');
      panel.style.display = 'none';
      panel.style.width = '340px';
      panel.style.height = '460px';
      panel.style.background = '#fff';
      panel.style.border = '1px solid #e2e8f0';
      panel.style.borderRadius = '16px';
      panel.style.boxShadow = '0 20px 50px rgba(0,0,0,0.2)';
      panel.style.marginBottom = '12px';
      panel.style.overflow = 'hidden';
      panel.style.fontFamily = 'ui-sans-serif, system-ui, sans-serif';

      var header = document.createElement('div');
      header.innerText = appearance.widgetTitle;
      header.style.padding = '12px 14px';
      header.style.fontWeight = '700';
      header.style.background = appearance.headerColor;
      header.style.color = '#fff';

      var messages = document.createElement('div');
      messages.style.height = '350px';
      messages.style.overflowY = 'auto';
      messages.style.padding = '12px';
      messages.style.background = '#f8fafc';

      var form = document.createElement('form');
      form.style.display = 'flex';
      form.style.gap = '8px';
      form.style.padding = '10px';
      form.style.borderTop = '1px solid #e2e8f0';

      var inputClassName = 'sitechat-input-' + botId.replace(/[^a-zA-Z0-9_-]/g, '');
      var styleTag = document.createElement('style');
      styleTag.textContent = '.' + inputClassName + '::placeholder{color:#475569;opacity:1;}';
      panel.appendChild(styleTag);

      var input = document.createElement('input');
      input.placeholder = 'Ask a question...';
      input.className = inputClassName;
      input.style.flex = '1';
      input.style.height = '38px';
      input.style.padding = '0 10px';
      input.style.border = '1px solid #cbd5e1';
      input.style.borderRadius = '10px';
      input.style.background = '#FFFFFF';
      input.style.color = '#000000';

      var send = document.createElement('button');
      send.type = 'submit';
      send.innerText = 'Send';
      send.style.height = '38px';
      send.style.padding = '0 12px';
      send.style.border = 'none';
      send.style.borderRadius = '10px';
      send.style.background = appearance.buttonColor;
      send.style.color = '#fff';
      send.style.cursor = 'pointer';

      function appendMessage(text, from) {
        var bubble = document.createElement('div');
        bubble.innerText = text;
        bubble.style.maxWidth = '90%';
        bubble.style.marginBottom = '8px';
        bubble.style.padding = '9px 11px';
        bubble.style.borderRadius = '12px';
        bubble.style.fontSize = '14px';
        bubble.style.lineHeight = '1.35';
        if (from === 'user') {
          bubble.style.marginLeft = 'auto';
          bubble.style.background = '#111111';
          bubble.style.color = '#FFFFFF';
        } else {
          bubble.style.background = '#FFFFFF';
          bubble.style.color = '#000000';
          bubble.style.border = '1px solid #e2e8f0';
        }
        messages.appendChild(bubble);
        messages.scrollTop = messages.scrollHeight;
      }

      form.addEventListener('submit', async function(e){
        e.preventDefault();
        var text = input.value.trim();
        if (!text) return;
        appendMessage(text, 'user');
        input.value = '';

        try {
          var res = await fetch('${apiOrigin}/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botId: botId, message: text })
          });
          var data = await res.json();
          appendMessage(data.answer || data.error || 'No response', 'bot');
        } catch (_) {
          appendMessage('Chat temporarily unavailable.', 'bot');
        }
      });

      button.addEventListener('click', function(){
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });

      form.appendChild(input);
      form.appendChild(send);
      panel.appendChild(header);
      panel.appendChild(messages);
      panel.appendChild(form);
      container.appendChild(panel);
      container.appendChild(button);
      document.body.appendChild(container);

      appendMessage(appearance.welcomeMessage, 'bot');
    })();
  })();`;

  return new Response(script, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  });
}
