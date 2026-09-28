(function () {
  'use strict';

  const form = document.getElementById('registrationForm');
  const reviewSection = document.getElementById('reviewSection');
  const reviewSuccess = document.getElementById('reviewSuccess');
  const additionalDetails = document.getElementById('additionalDetails');
  const submitButton = document.getElementById('submitButton');
  const submitSuccess = document.getElementById('submitSuccess');

  let reviewOpened = false;

  function openReviewSection() {
    if (reviewOpened) return;
    reviewOpened = true;

    additionalDetails.hidden = false;
    reviewSuccess.hidden = false;
    reviewSection.classList.add('is-open');
    reviewSection.setAttribute('aria-expanded', 'true');
    submitButton.disabled = false;
  }

  // Double-click opens the section. A single click does nothing.
  reviewSection.addEventListener('dblclick', openReviewSection);

  // Prevent the second click of a double-click from selecting text.
  reviewSection.addEventListener('mousedown', (event) => {
    if (event.detail > 1) event.preventDefault();
  });

  // Keyboard alternative: Enter or Space.
  reviewSection.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) openReviewSection();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!reviewOpened) return;
    submitSuccess.hidden = false;
  });
})();
