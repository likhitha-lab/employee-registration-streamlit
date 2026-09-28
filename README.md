# Form Interaction Test

Proof of concept that tests two things:

1. Whether a user can double-click a form section, as an intentional "open" gesture, on a clean form page modeled on the layout of Microsoft Forms.
2. Whether that interaction can be captured as a structured event and later forwarded to a Microsoft Copilot Studio agent.

The right-side "Copilot Agent" panel renders Microsoft Bot Framework Web Chat connected to a Copilot Studio agent over Direct Line. When the Review section opens, `notifyCopilotStudio` in `public/app.js`:

1. Logs the event to the browser console.
2. Records it in the on-page Event Log.
3. Dispatches a browser `CustomEvent` with the same name.
4. If Web Chat is connected, sends a Direct Line event activity to the agent:
   ```js
   store.dispatch({
     type: 'WEB_CHAT/SEND_EVENT',
     payload: { name: eventName, value: payload }
   });
   ```

If Web Chat is not connected, steps 1 to 3 still run and the Review section shows "Review section opened locally but Copilot Studio was not notified."

The application works without Copilot Studio configured. The panel then shows a Disconnected state.

No Microsoft trademarks, logos or proprietary assets are used.

## Technology

- Node.js (20.12 or later) and Express
- Microsoft Bot Framework Web Chat, loaded from `https://cdn.botframework.com`
- HTML5, CSS3 and vanilla JavaScript
- No database, frontend framework or TypeScript

## Project structure

```
package.json        Dependencies and npm scripts
server.js           Express server: static files, GET /health, GET /api/copilot/token
public/index.html   Page markup and Web Chat script
public/styles.css   Styles and responsive layout
public/app.js       Validation, double-click handling, event log, Web Chat and Copilot bridge
.env.example        Example environment variables
.gitignore
README.md
```

## Install and run

```bash
npm install
npm start
```

The server listens on `0.0.0.0` and uses `PORT` from the environment, falling back to `8080`.

Open http://localhost:8080 in a browser.

To use a different port:

```bash
PORT=3000 npm start
```

On Windows PowerShell:

```powershell
$env:PORT=3000; npm start
```

Health check:

```bash
curl http://localhost:8080/health
```

Expected response:

```json
{ "status": "ok", "application": "forms-doubleclick-poc" }
```

## Copilot Studio configuration

### Values to retrieve from Copilot Studio

You need exactly one value: the agent's **Token Endpoint** URL.

1. Open https://copilotstudio.microsoft.com and select the environment that contains your agent.
2. Open the agent.
3. Go to **Settings > Security > Authentication** and select **No authentication**. The token endpoint only issues anonymous tokens when this is set. Save.
4. Go to **Settings > Security > Web channel security** and make sure **Require secured access** is turned off. When it is on, Direct Line secrets are required instead of the token endpoint, which this POC does not use.
5. **Publish** the agent. Unpublished changes are not available through the channel.
6. Go to **Settings > Channels > Mobile app** (in some tenants this channel is labelled differently, for example "Native app" or "Custom app"). Next to **Token Endpoint**, select **Copy**.

The copied URL has this form:

```
https://<environment-host>.environment.api.powerplatform.com/powervirtualagents/botsbyschema/<agent-schema-name>/directline/token?api-version=<version>
```

Do not use the Web app embed code or the Direct Line secrets. They are not needed.

### Set the value on the server

Copy `.env.example` to `.env` and paste the URL:

```
COPILOT_TOKEN_ENDPOINT=https://...directline/token?api-version=...
```

Or set it in the shell before `npm start`:

```bash
export COPILOT_TOKEN_ENDPOINT="https://...directline/token?api-version=..."
npm start
```

`.env` is listed in `.gitignore`. The URL is read only by `server.js` and is never sent to the browser.

### How the token flow works

1. The browser calls `GET /api/copilot/token`.
2. `server.js` calls `COPILOT_TOKEN_ENDPOINT` and receives a short-lived Direct Line token.
3. `server.js` also reads the agent's regional Direct Line URL from the `regionalchannelsettings` resource next to the token endpoint, so Web Chat connects to the correct region.
4. The browser receives `{ token, expiresIn, directLineDomain }` and starts Web Chat.

Responses from `/api/copilot/token`:

| Status | Meaning |
|--------|---------|
| 200 | Token issued |
| 503 `not_configured` | `COPILOT_TOKEN_ENDPOINT` is not set |
| 500 `invalid_config` | Value is not a valid `https` URL |
| 502 `token_failed` | Copilot Studio returned an error or could not be reached |

### Connection states in the Copilot Agent panel

| Badge | Meaning |
|-------|---------|
| Connecting | Token requested or Direct Line connecting |
| Connected | Direct Line online. Events are sent to Copilot Studio |
| Disconnected (grey) | Not configured, or conversation ended |
| Disconnected (red) | Web Chat script failed to load, token request failed, connection failed, or token expired |

### Handling the event in Copilot Studio

The agent must have a topic that reacts to the event, or it will be ignored:

1. In the agent, go to **Topics > Add a topic > From blank**.
2. Change the trigger to **Event received** (in some versions: **A custom client event occurs**).
3. Set the event name to `ReviewSectionOpened`.
4. Add nodes. The payload is available in `System.Activity.Value`, for example `System.Activity.Value.section` and `System.Activity.Value.timestamp`.
5. Add a **Send a message** node such as "Your details are ready for review." to confirm receipt in the chat.
6. Save and publish the agent.

After connecting, Web Chat also sends a `startConversation` event so the agent's greeting topic runs.

## Running in Google Cloud Shell

1. Open Google Cloud Shell and upload or clone this project.
2. Change into the project directory and install dependencies:
   ```bash
   cd forms-doubleclick-poc
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. In the Cloud Shell toolbar, click **Web Preview** and choose **Preview on port 8080**.
5. A new browser tab opens with the application. Append `/health` to the URL to check the health route.

The server binds to `0.0.0.0` on port 8080 by default, which is what Web Preview expects. If you change the port, use **Web Preview > Change port** to match.

## How the interaction works

- A single click on the "Review your information" section does nothing.
- A double-click validates Full name, Work email and Department.
  - If a field is invalid, an inline message appears under that field and in the Review section.
  - If all fields are valid, the section turns green, "Review section opened successfully." is shown, the Additional Details section appears, the Submit button is enabled, and `notifyCopilotStudio("ReviewSectionOpened", payload)` is called.
- Keyboard alternative: Tab to the Review section and press Enter or Space. Screen-reader activation of the section is treated the same way.
- Submit does not send anything over the network. It shows "Test form submitted successfully." and writes `FormSubmitted` to the Event Log.
- Reset Test restores the initial state of the page.

Payload sent with `ReviewSectionOpened`:

```js
{
  section: "Review your information",
  interaction: "dblclick",
  status: "opened",
  timestamp: new Date().toISOString()
}
```

The keyboard path sends the same payload, including `interaction: "dblclick"`, so both paths produce an identical event.

To observe the CustomEvent from the browser console:

```js
window.addEventListener('ReviewSectionOpened', (e) => console.log(e.detail));
```

## Initial test cases

| ID | Test | Steps | Expected result |
|----|------|-------|-----------------|
| TC-01 | Server health | `GET /health` | `200` with `{"status":"ok","application":"forms-doubleclick-poc"}` |
| TC-02 | Page loads | Open `/` | Form card "Event Registration Form", description, three required fields, Review section and "Copilot Agent" panel are visible. Additional Details is hidden. Submit is disabled. Event Log shows "No events recorded yet." |
| TC-03 | Single click ignored | Fill all fields, single-click the Review section | Nothing opens. No Event Log entry. Submit stays disabled. |
| TC-04 | Validation, empty form | Leave fields empty, double-click the Review section | Inline errors under Full name, Work email and Department. Review section shows an error message. Additional Details stays hidden. No Event Log entry. |
| TC-05 | Validation, bad email | Enter a name, `test@`, a department; double-click Review | Only the Work email error is shown. Section does not open. |
| TC-06 | Error clears on correction | After TC-04, fill a field correctly | That field's inline error disappears. |
| TC-07 | Successful double-click | Enter valid values, double-click Review | Section turns green, "Review section opened successfully." is shown, Additional Details (Location, Comments) appears, Submit is enabled, Event Log shows `ReviewSectionOpened`. |
| TC-08 | Console and CustomEvent | Open DevTools, repeat TC-07 | Console shows `[notifyCopilotStudio] ReviewSectionOpened {...}` and `[CustomEvent received] ReviewSectionOpened {...}` with the correct payload shape and an ISO timestamp. |
| TC-09 | Keyboard: Enter | Fill fields, Tab to Review section, press Enter | Same result as TC-07. |
| TC-10 | Keyboard: Space | Reset, fill fields, Tab to Review section, press Space | Same result as TC-07. Page does not scroll. |
| TC-11 | No duplicate open | After TC-07, double-click Review again | No second `ReviewSectionOpened` entry. |
| TC-12 | Submit | After TC-07, click Submit | "Test form submitted successfully." is shown. Event Log shows `FormSubmitted`. No network request in the DevTools Network tab. |
| TC-13 | Submit re-validates | After TC-07, clear Full name, click Submit | Inline error on Full name. No `FormSubmitted` entry. |
| TC-14 | Reset | After TC-12, click Reset Test | Fields cleared, errors cleared, Additional Details hidden, Review section back to default style, Event Log empty, Submit disabled. |
| TC-15 | Responsive layout | Resize the browser below 900px wide | Layout changes to a single column with the Copilot Agent panel below the form. |
| TC-16 | Accessibility | Inspect with a screen reader or accessibility tree | Review section is focusable, exposed as a button with name "Review your information", `aria-expanded` changes from `false` to `true`, and status messages are announced. |
| TC-17 | Token route, not configured | Unset `COPILOT_TOKEN_ENDPOINT`, `GET /api/copilot/token` | `503` with `error: "not_configured"`. |
| TC-18 | Disconnected state | Unset `COPILOT_TOKEN_ENDPOINT`, open `/` | Badge shows Disconnected with a "not configured" message. |
| TC-19 | Local-only fallback | With TC-18 state, complete TC-07 | Local behavior of TC-07 happens, plus "Review section opened locally but Copilot Studio was not notified." |
| TC-20 | Token route, configured | Set `COPILOT_TOKEN_ENDPOINT`, `GET /api/copilot/token` | `200` with a `token`. Response does not contain the endpoint URL. |
| TC-21 | Connected state | With TC-20 configuration, open `/` | Badge changes from Connecting to Connected. Web Chat renders. Greeting appears if the agent has one. |
| TC-22 | Event reaches agent | With TC-21 state, complete TC-07 | No fallback message. Console shows "Event sent to Copilot Studio". The `ReviewSectionOpened` topic runs and its message appears in Web Chat. |
| TC-23 | Web Chat script blocked | Block `cdn.botframework.com` in DevTools, reload | Badge shows Disconnected (red). Form still works locally and shows the fallback message on open. |

## Production considerations

- Direct Line tokens expire (about one hour). This POC shows a Disconnected state on expiry; production should refresh the token.
- `/api/copilot/token` is unauthenticated. Anyone who can reach the server can obtain an anonymous token. Add authentication and rate limiting before exposing it publicly.
- For agents that require user sign-in or secured web channel access, replace the token endpoint with a server-side Direct Line secret exchange.
- Pin a specific Web Chat version instead of `latest` in `public/index.html`.
