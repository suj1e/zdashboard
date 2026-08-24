## Purpose

Provides seamless, user-unaware hot-update behavior for the dashboard. When project files change on disk, the UI SHALL update in place without full-page reload, preserving scroll position, selection state, and in-flight user input.

## ADDED Requirements

### Requirement: No full-page reload on file change
The dashboard SHALL NOT perform `location.reload()` or any equivalent full-page refresh when project files change.

#### Scenario: User edits a watched file
- **WHEN** a watched project file is saved to disk
- **THEN** the dashboard updates affected UI regions in place and preserves all existing page state

#### Scenario: Multiple files change in rapid succession
- **WHEN** multiple files are saved within the debounce window
- **THEN** the dashboard coalesces them into a single update cycle

### Requirement: Partial plugin refresh
Each plugin SHALL support receiving a `files` SSE event and refreshing only its own data without affecting other plugins or global page state.

#### Scenario: Apply plugin receives files event
- **WHEN** the apply plugin receives a `files` SSE event
- **THEN** it SHALL re-fetch `/__apply` and update only its own change list and worktree view

#### Scenario: View plugin receives files event
- **WHEN** the view plugin receives a `files` SSE event
- **THEN** it SHALL re-fetch `/__files` and update the sidebar tree without resetting the main content viewer

#### Scenario: Review plugin receives files event
- **WHEN** the review plugin receives a `files` SSE event
- **THEN** it SHALL re-fetch `/__review` and `/__docs` and update the review list and document list

### Requirement: Optimistic mutations
Plugins that support user mutations SHALL update local UI state immediately, then confirm or roll back after the server responds.

#### Scenario: User updates a review item
- **WHEN** a user submits an answer or changes an item state
- **THEN** the review list SHALL reflect the change immediately
- **AND** if the server request fails, the UI SHALL revert to the previous state and show an error toast

#### Scenario: User checks a task in apply
- **WHEN** a user toggles a task checkbox
- **THEN** the task progress SHALL update immediately
- **AND** if the server request fails, the checkbox SHALL revert and show an error toast

### Requirement: Incremental file-tree updates
The view sidebar file tree SHALL preserve expand/collapse state and selection when files are added or removed, applying only the minimal DOM changes needed.

#### Scenario: A new markdown file is added
- **WHEN** a new file appears in the project tree
- **THEN** the tree SHALL insert the new node with an entrance animation
- **AND** existing expanded directories and selected files SHALL remain unchanged

#### Scenario: A file is deleted
- **WHEN** a file is removed from the project tree
- **THEN** the tree SHALL remove the node with an exit animation
- **AND** if the deleted file was selected, the viewer SHALL clear or show an empty state without reloading the page

### Requirement: Silent SSE reconnection
If the SSE connection drops, the dashboard SHALL reconnect silently without showing a persistent error state or interrupting the current view.

#### Scenario: SSE connection temporarily drops
- **WHEN** the `/__reload` SSE connection is lost
- **THEN** the status indicator MAY briefly show disconnected, but SHALL NOT show a persistent error overlay or block user interaction
- **AND** once reconnected, the dashboard SHALL refresh current plugin data to recover consistency

### Requirement: Filtered and debounced file watching
The file watcher SHALL ignore transient editor and OS files, and SHALL coalesce rapid changes into a single update cycle.

#### Scenario: IDE formats on save
- **WHEN** an IDE writes multiple temporary files during a format/save operation
- **THEN** the watcher SHALL ignore known transient files such as `.swp`, `.tmp`, `~` prefixed files, `.DS_Store`, and `Thumbs.db`
- **AND** the remaining legitimate saves SHALL be debounced into one update

#### Scenario: Slow network or disk
- **WHEN** file system events are delayed or bursty
- **THEN** the watcher SHALL use a debounce of at least 300ms before emitting a reload event
