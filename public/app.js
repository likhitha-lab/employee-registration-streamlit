(function () {
  'use strict';

  const SECTION_NAME = 'Review your information';
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const form = document.getElementById('testForm');
  const fullName = document.getElementById('fullName');
  const workEmail = document.getElementById('workEmail');
  const department = document.getElementById('department');
  const reviewSection = document.getElementById('reviewSection');
  const reviewStatus = document.getElementById('reviewStatus');
  const additionalDetails = document.getElementById('additionalDetails');
  const submitButton = document.getElementById('submitButton');
  const resetButton = document.getElementById('resetButton');
  const submitStatus = document.getElementById('submitStatus');
  const eventLogList = document.getElementById('eventLogList');
  const eventLogEmpty = document.getElementById('eventLogEmpty');
  const copilotNotice = document.getElementById('copilotNotice');
  const copilotWebChat = document.getElementById('copilotWebChat');
  const copilotStatus = document.getElementById('copilotStatus');
  const copilotStatusText = document.getElementById('copilotStatusText');
  const copilotDetail = document.getElementById('copilotDetail');

  const COPILOT_NOT_NOTIFIED_MESSAGE = 'Review section opened locally but Copilot Studio was not notified.';

  const requiredFields = [
    {
      input: fullName,
      error: document.getElementById('fullNameError'),
      validate: (value) => (value.trim() ? '' : 'Full name is required.')
    },
    {
      input: workEmail,
      error: document.getElementById('workEmailError'),
      validate: (value) => {
        const trimmed = value.trim();
        if (!trimmed) return 'Work email is required.';
        if (!EMAIL_PATTERN.test(trimmed) || !workEmail.checkValidity()) {
          return 'Enter a valid work email, for example name@company.com.';
        }
        return '';
      }
    },
    {
      input: department,
      error: document.getElementById('departmentError'),
      validate: (value) => (value ? '' : 'Select a department.')
    }
  ];

  let reviewOpened = false;

  /* ---------- Validation ---------- */

  function setFieldError(field, message) {
    if (message) {
      field.error.textContent = message;
      field.error.hidden = false;
      field.input.setAttribute('aria-invalid', 'true');
    } else {
      field.error.textContent = '';
      field.error.hidden = true;
      field.input.removeAttribute('aria-invalid');
    }
  }

  function validateRequiredFields() {
    let firstInvalid = null;
    requiredFields.forEach((field) => {
      const message = field.validate(field.input.value);
      setFieldError(field, message);
      if (message && !firstInvalid) firstInvalid = field.input;
    });
    return { valid: !firstInvalid, firstInvalid };
  }

  // Clear a field's error as soon as the user corrects it.
  requiredFields.forEach((field) => {
    const eventName = field.input.tagName === 'SELECT' ? 'change' : 'input';
    field.input.addEventListener(eventName, () => {
      if (field.input.getAttribute('aria-invalid') === 'true' && !field.validate(field.input.value)) {
        setFieldError(field, '');
      }
    });
  });

  /* ---------- Event log ---------- */

  function addLogEntry(eventName, payload) {
    const item = document.createElement('li');
    item.className = 'event-log__item';

    const time = document.createElement('span');
    time.className = 'event-log__time';
    time.textContent = new Date(payload.timestamp).toLocaleTimeString();

    const name = document.createElement('span');
    name.className = 'event-log__name';
    name.textContent = eventName;

    const detail = document.createElement('code');
    detail.className = 'event-log__detail';
    detail.textContent = JSON.stringify(payload);

    item.append(time, name, detail);
    eventLogList.appendChild(item);
    eventLogEmpty.hidden = true;
  }

  function clearLog() {
    eventLogList.replaceChildren();
    eventLogEmpty.hidden = false;
  }

  /* ---------- Copilot Studio Web Chat ---------- */

  // Direct Line connectionStatus$ values (botframework-directlinejs ConnectionStatus).
  const CONNECTION_STATUS = {
    0: 'Uninitialized',
    1: 'Connecting',
    2: 'Online',
    3: 'ExpiredToken',
    4: 'FailedToConnect',
    5: 'Ended'
  };

  const copilot = {
    store: null,
    connected: false
  };

  function setCopilotState(state, label, detail) {
    copilotStatus.classList.remove('is-connected', 'is-connecting', 'is-disconnected', 'is-error');
    copilotStatus.classList.add(`is-${state}`);
    copilotStatusText.textContent = label;
    copilotDetail.textContent = detail || '';
    copilot.connected = state === 'connected';
  }

  function handleConnectionStatus(status) {
    const name = CONNECTION_STATUS[status] || 'Unknown';
    console.log('[Copilot] Direct Line status:', name);

    switch (status) {
      case 0:
      case 1:
        setCopilotState('connecting', 'Connecting', 'Connecting to Copilot Studio.');
        break;
      case 2:
        setCopilotState('connected', 'Connected', 'Form events are sent to Copilot Studio.');
        break;
      case 3:
        setCopilotState('error', 'Disconnected', 'The Copilot Studio token expired. Reload the page to reconnect.');
        break;
      case 4:
        setCopilotState('error', 'Disconnected', 'Could not connect to Copilot Studio.');
        break;
      default:
        setCopilotState('disconnected', 'Disconnected', 'The Copilot Studio conversation has ended.');
    }
  }

  async function initCopilotWebChat() {
    if (!window.WebChat) {
      setCopilotState('error', 'Disconnected', 'Web Chat could not be loaded. Check the network connection.');
      return;
    }

    setCopilotState('connecting', 'Connecting', 'Requesting a Copilot Studio token.');

    let tokenData;
    try {
      const response = await fetch('/api/copilot/token', { cache: 'no-store' });
      tokenData = await response.json().catch(() => ({}));
      if (!response.ok) {
        const notConfigured = tokenData.error === 'not_configured';
        setCopilotState(
          notConfigured ? 'disconnected' : 'error',
          'Disconnected',
          notConfigured
            ? 'Copilot Studio is not configured. Set COPILOT_TOKEN_ENDPOINT on the server.'
            : tokenData.message || 'Could not obtain a Copilot Studio token.'
        );
        return;
      }
    } catch (err) {
      console.error('[Copilot] Token request failed:', err);
      setCopilotState('error', 'Disconnected', 'Could not reach the token service.');
      return;
    }

    const directLineOptions = { token: tokenData.token };
    if (tokenData.directLineDomain) directLineOptions.domain = tokenData.directLineDomain;
    const directLine = window.WebChat.createDirectLine(directLineOptions);

    // Ask Copilot Studio to start the conversation (greeting topic) once connected.
    copilot.store = window.WebChat.createStore({}, ({ dispatch }) => (next) => (action) => {
      if (action.type === 'DIRECT_LINE/CONNECT_FULFILLED') {
        dispatch({
          type: 'WEB_CHAT/SEND_EVENT',
          payload: { name: 'startConversation', value: { locale: navigator.language } }
        });
      }
      return next(action);
    });

    directLine.connectionStatus$.subscribe(handleConnectionStatus);

    copilotWebChat.replaceChildren();
    copilotWebChat.classList.add('is-live');
    window.WebChat.renderWebChat(
      {
        directLine,
        store: copilot.store,
        locale: navigator.language,
        styleOptions: {
          accent: '#6b3fa0',
          bubbleBorderRadius: 8,
          bubbleFromUserBackground: '#efe7f8',
          bubbleFromUserBorderRadius: 8,
          hideUploadButton: true
        }
      },
      copilotWebChat
    );
  }

  /* ---------- Copilot Studio bridge ---------- */

  /**
   * Forwards a form interaction event to the Copilot Studio agent.
   * Always logs locally and dispatches a browser CustomEvent. When Web Chat is
   * connected, also sends a Direct Line event activity through the Web Chat store.
   * Returns true if the event was sent to Copilot Studio.
   */
  function notifyCopilotStudio(eventName, payload) {
    console.log('[notifyCopilotStudio]', eventName, payload);
    addLogEntry(eventName, payload);
    window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));

    if (!copilot.store || !copilot.connected) {
      console.warn('[notifyCopilotStudio] Web Chat is unavailable. Event not sent to Copilot Studio.');
      return false;
    }

    try {
      copilot.store.dispatch({
        type: 'WEB_CHAT/SEND_EVENT',
        payload: {
          name: eventName,
          value: payload
        }
      });
      console.log('[notifyCopilotStudio] Event sent to Copilot Studio:', eventName);
      return true;
    } catch (err) {
      console.error('[notifyCopilotStudio] Failed to send event:', err);
      return false;
    }
  }

  // Example consumer of the CustomEvent. A future Web Chat adapter can listen here.
  window.addEventListener('ReviewSectionOpened', (event) => {
    console.log('[CustomEvent received] ReviewSectionOpened', event.detail);
  });

  /* ---------- Review section ---------- */

  function openReviewSection() {
    if (reviewOpened) return;

    const result = validateRequiredFields();
    if (!result.valid) {
      reviewSection.classList.remove('is-success');
      reviewSection.classList.add('is-error');
      reviewStatus.textContent = 'Please complete the required fields highlighted above before continuing.';
      result.firstInvalid.focus();
      return;
    }

    reviewOpened = true;
    additionalDetails.hidden = false;
    reviewSection.classList.remove('is-error');
    reviewSection.classList.add('is-success');
    reviewSection.setAttribute('aria-expanded', 'true');
    reviewStatus.textContent = 'Review section opened successfully.';
    submitButton.disabled = false;

    const payload = {
      section: SECTION_NAME,
      interaction: 'dblclick',
      status: 'opened',
      timestamp: new Date().toISOString()
    };
    const sent = notifyCopilotStudio('ReviewSectionOpened', payload);
    copilotNotice.textContent = sent ? '' : COPILOT_NOT_NOTIFIED_MESSAGE;
  }

  reviewSection.addEventListener('dblclick', openReviewSection);

  // Prevent the second click of a double-click from selecting text.
  reviewSection.addEventListener('mousedown', (event) => {
    if (event.detail > 1) event.preventDefault();
  });

  // A single mouse click intentionally does nothing (event.detail >= 1).
  // Clicks with detail === 0 come from assistive technology activating the
  // button (for example a screen reader in browse mode), so treat those as
  // the keyboard alternative.
  reviewSection.addEventListener('click', (event) => {
    if (event.detail === 0) openReviewSection();
  });

  reviewSection.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (!event.repeat) openReviewSection();
    }
  });

  /* ---------- Submit ---------- */

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!reviewOpened) return;

    const result = validateRequiredFields();
    if (!result.valid) {
      submitStatus.classList.add('is-error');
      submitStatus.textContent = 'Please correct the highlighted fields before submitting.';
      result.firstInvalid.focus();
      return;
    }

    submitStatus.classList.remove('is-error');
    submitStatus.textContent = 'Test form submitted successfully.';
    addLogEntry('FormSubmitted', {
      section: 'Event Registration Form',
      interaction: 'submit',
      status: 'submitted',
      timestamp: new Date().toISOString()
    });
  });

  /* ---------- Reset ---------- */

  resetButton.addEventListener('click', () => {
    form.reset();
    requiredFields.forEach((field) => setFieldError(field, ''));

    reviewOpened = false;
    additionalDetails.hidden = true;
    reviewSection.classList.remove('is-success', 'is-error');
    reviewSection.setAttribute('aria-expanded', 'false');
    reviewStatus.textContent = '';
    copilotNotice.textContent = '';

    submitButton.disabled = true;
    submitStatus.classList.remove('is-error');
    submitStatus.textContent = '';

    clearLog();
    fullName.focus();
    console.log('[Form Interaction Test] Test reset.');
  });

  initCopilotWebChat();
})();
