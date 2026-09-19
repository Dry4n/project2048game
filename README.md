# 2048

A dark-themed version of the classic **2048** game, built with vanilla JavaScript, HTML and CSS.

**[Play the web version](https://dry4n.github.io/project2048game/)** · **[Firefox extension](https://addons.mozilla.org/en-US/firefox/addon/dark2048/)**

## Features

- Classic 4×4 2048 gameplay
- Arrow-key controls
- Random spawning of 2 and 4 tiles
- Score tracking
- Persistent best score with `localStorage`
- Victory state when reaching 2048, with the option to continue playing
- Game-over detection
- Restart controls
- Custom dark visual theme

## Screenshot

A gameplay screenshot or GIF will be added here as a future presentation improvement.

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript
- Browser `localStorage`

No frameworks or external game libraries are used.

## Run locally

No build step is required.

1. Clone or download the repository.
2. Open `index.html` in your browser.
3. Use the arrow keys to move the tiles.

```bash
git clone https://github.com/Dry4n/project2048game.git
cd project2048game
```

Then open `index.html`.

## Project structure

```text
project2048game/
├── index.html      # Page structure and game UI
├── style.css       # Layout, theme and visual styling
├── game.js         # Game logic, scoring and input handling
└── img/
    ├── icon2048.jpg
    └── icon2048.svg
```

## Firefox extension

The game is also published as **Dark2048** on Firefox Add-ons:

https://addons.mozilla.org/en-US/firefox/addon/dark2048/

## Future improvements

- Fix edge cases around the victory-state reset
- Guard `spawnPiece()` against a full-board infinite loop
- Add tile movement animations
- Add score-change animations and improve the scoreboard
- Rework the game-over and victory screens
- Host fonts locally
- Improve keyboard accessibility, including Enter-to-restart
- Add a gameplay screenshot or GIF to this README

## About this project

Built as a hands-on exercise in JavaScript game logic, DOM manipulation, state management and browser storage.
