# @supercomponents/shared

A library of shared Svelte components that can be individually imported.

## Installation

```bash
npm install @supercomponents/shared
```

## Usage

You can import individual components directly:

```js
// Import specific components
import { SuperButton } from '@supercomponents/shared';

// Or import a specific component directly
import SuperButton from '@supercomponents/shared/SuperButton';
```

## Available Components

- **SuperButton**: A versatile button component with various types, styles, and action modes

## Component Documentation

### SuperButton

A flexible button component with multiple variants and action modes.

#### Props

- `size`: Button size ('S', 'M', 'L'). Default: 'M'
- `type`: Button type ('primary', 'secondary', 'cta', 'warning', 'ink', 'menu', 'overBackground'). Default: 'primary'
- `text`: Button text. Default: ''
- `icon`: CSS class for the icon to display
- `iconAfterText`: Whether to show the icon after the text. Default: false
- `quiet`: Remove background/border styling
- `disabled`: Disable the button
- `selected`: Mark the button as selected
- `fullWidth`: Make the button take up the full width of its container
- `iconOnly`: Show only the icon (hides text)
- `onClick`: Function to call when the button is clicked

##### Action Mode Props

- `actionsMode`: Action mode ('normal', 'loop', 'conditional', 'timer'). Default: 'normal'
- `condition`: Condition for conditional mode
- `loopSource`: Data source for loop mode (array or JSON string)
- `loopDelay`: Delay between loop iterations (ms)
- `loopEvent`: Function to call for each loop iteration
- `timerDuration`: Duration for timer mode (seconds). Default: 60

##### Event Handlers

- `onTimer`: Function called when timer completes
- `onLoopStart`: Function called when loop starts
- `onLoopEnd`: Function called when loop ends
- `onTrueCondition`: Function called when condition is true in conditional mode
- `onFalseCondition`: Function called when condition is false in conditional mode

#### Events

- `click`: Dispatched when the button is clicked
