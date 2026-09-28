# Employee Registration Form

Static HTML, CSS and JavaScript page with a clean form layout. No build step, no framework, no backend.

## Run on port 8080

From this folder, use any static file server. For example:

```bash
npx --yes http-server . -p 8080 -c-1
```

or

```bash
python -m http.server 8080
```

Open http://localhost:8080.

## Behavior

- A double-click on "Review your information" shows Additional Details and the message "Review section opened successfully." and enables Submit. Enter or Space does the same from the keyboard. A single click does nothing.
- Submit is disabled until the review section opens. Clicking it shows "Form submitted successfully." Nothing is sent over the network.

## Test IDs

| data-testid | Element |
|-------------|---------|
| `full-name` | Full Name input |
| `work-email` | Work Email input |
| `department` | Department select |
| `review-section` | Review section |
| `submit-button` | Submit button |
| `review-success` | "Review section opened successfully." message (hidden until opened) |
| `submit-success` | "Form submitted successfully." message (hidden until submitted) |
