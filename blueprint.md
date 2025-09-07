# 📱 Web OS Browser Blueprint

This blueprint outlines the features and flow for the **Web OS Browser** — a web app that functions like a lightweight mobile operating system, letting users browse multiple sites in isolated "apps."

---

## 1. Core Concept

- Each website URL added by the user acts as an **App**.
- Apps open inside their own **tab/iframe** (sandboxed browser instance).
- User switches between apps like switching between apps on a phone.
- Long-press (or right-click on desktop) allows **edit/delete** actions.

---

## 2. Core Features

### 🔹 App Management
- **Add App**: Input URL + Name (optional icon).
- **Edit App**: Change name, URL, or icon.
- **Delete App**: Remove app from system.

### 🔹 App Switcher
- View all open apps as thumbnails/cards.
- Swipe (mobile) or click (desktop) to switch.
- Close app directly from switcher.

### 🔹 App Runtime
- Each app runs inside an **iframe container**.
- Apps run in background until closed.
- Switching does not reload apps (preserves state).

---

## 3. UI Structure

### Main Views
1. **Home Screen**
   - Grid of app icons (like mobile home screen).
   - "Add App" button at bottom.

2. **App Screen**
   - Fullscreen iframe with top navigation bar.
   - Options: Back to Home, App Switcher.

3. **App Switcher**
   - Horizontal/vertical scrolling list of app thumbnails.
   - Options: Switch to app, Close app.

4. **Context Menu (Long-Press / Right-Click)**
   - Edit App
   - Delete App
   - Pin/Unpin (optional)

---

## 4. Data Model

```json
{
  "apps": [
    {
      "id": "uuid",
      "name": "Twitter",
      "url": "https://twitter.com",
      "icon": "🌐",
      "lastOpened": "timestamp"
    }
  ],
  "openApps": ["uuid1", "uuid2"],
  "activeApp": "uuid1"
}
```


## 5. Tech Stack

- Frontend: React (or Next.js for routing)
- State Management: Context API / Zustand
- Storage: LocalStorage or IndexedDB
- UI Styling: TailwindCSS
- Optional Animations: Framer Motion

## 6. User Flow

1. Open App
    - User clicks an app icon → iframe loads website → stored as activeApp.

2. Switch App
    - User opens App Switcher → selects another app → iframe brought to front.

3. Long-Press App
    - Context menu opens → user chooses Edit/Delete.

4. Edit/Delete
    - If edit → open modal, update URL/name/icon.
    - If delete → remove from storage & UI.

---

## 7. Iframe Lifecycle & Switching (No Reloads)

Goal: Switching between apps must not reload the iframe contents. Preserve runtime state for each open app until it is explicitly closed or edited.

### Principles
- Keep iframes mounted: Never unmount an app's iframe during switches; hide inactive frames via CSS.
- Stable identity: One iframe per `openAppId`; do not change its `src` unless the app URL is edited.
- Persistent host: Place the iframe host in a component that never unmounts (e.g., top-level layout/provider) so routing or view changes don’t tear down frames.

### Implementation Options
- Declarative stacking:
  - Render all open iframes and stack them absolutely.
  - Toggle visibility and pointer events based on `activeApp`.
  - Example styles: `position: absolute; inset: 0; border: 0; visibility: visible|hidden; pointer-events: auto|none`.
- Imperative host (more robust):
  - Manage a DOM container and create each iframe once via `document.createElement('iframe')` on first open.
  - Append/remove only when apps are opened/closed; toggle `visibility` and `pointer-events` for switching.
  - React state changes never recreate DOM nodes; reduces accidental reloads from re-renders.

### Pitfalls to Avoid
- Do not conditionally render only the active iframe (would unmount others).
- Do not use changing `key`s tied to `activeApp` (would force remounts).
- Do not recompute/mutate `src` on every render; set once per app.

### Closing, Editing, and Memory
- Closing an app: Remove its iframe node and delete from `openApps`.
- Editing URL: Explicitly reload by updating the existing iframe's `src`, or close/reopen; communicate potential state loss to the user.
- Memory control: Maintain an LRU of open iframes (e.g., keep last 3–5). On exceeding the limit, close the least-recently used to free memory.

### Mobile and Platform Constraints
- Background iframes may be throttled/suspended by browsers (notably iOS Safari). Under memory pressure, a suspended frame may reload when reactivated.
- Accept that some reloads are OS/browser-driven and cannot be prevented in the web sandbox.

### Security & Embedding
- Use `sandbox` attribute with a minimal allowlist (e.g., `allow-forms allow-scripts allow-same-origin`) and explicit `allow` features (`geolocation; microphone; camera`) as needed.
- Some sites disallow embedding via `X-Frame-Options`/CSP. Detect load failures and show a friendly fallback (e.g., "Cannot embed; open in new tab").

### Minimal Pseudocode
Declarative layer:

```
<div class="host">
  {openIds.map(id => (
    <iframe
      key={id}
      src={appsById[id].url}
      sandbox=""
      style={{ position: 'absolute', inset: 0, border: 0,
               visibility: id === activeId ? 'visible' : 'hidden',
               pointerEvents: id === activeId ? 'auto' : 'none' }}
    />
  ))}
</div>
```

Imperative host:

```
const container = ref(null)
const frames = new Map()

// on openIds change: create missing iframes once; remove closed ones
for (id of openIds) if (!frames.has(id)) { create iframe, set src, append to container; frames.set(id, iframe) }
for ([id, iframe] of frames) if (!openIds.includes(id)) { iframe.remove(); frames.delete(id) }

// on activeId change: toggle visibility/pointer-events; do not touch src
for ([id, iframe] of frames) { set visible if id === activeId else hidden }
```

### Open Questions
- What is the target LRU size for background apps on mobile vs desktop?
- Which permissions (geolocation, camera, etc.) should be allowed by default vs per-app prompts?
- Error UX for non-embeddable sites (modal, inline card, or auto-open new tab)?
